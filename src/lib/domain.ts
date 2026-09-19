import { parseSchedule } from "./schedule";
import { normalizeRegion, validRegion } from "./regions";
import { randomUUID } from "node:crypto";
import {
  categories,
  normalizeCategory,
  businessCategories,
  flags,
  quotePolicy as policy,
} from "./config";
import { onlineRegion } from "./service-mode";
import {
  AppError,
  required,
  money,
  iso,
  type Database,
  type Row,
  type User,
  publicUser,
} from "./types";
const hour = 3600000;
const owned = (row: Row, user: User) => {
  if (row.ownerId !== user.id) throw new AppError("접근 권한이 없습니다.", 403);
};
const find = (db: Database, id: unknown, kind?: string) => {
  const row = db.rows.find((r) => r.id === id && (!kind || r.kind === kind));
  if (!row) throw new AppError("항목을 찾을 수 없습니다.", 404);
  return row;
};
const add = (
  db: Database,
  user: User,
  kind: string,
  data: Record<string, unknown>,
  now: number,
): Row => {
  const row = {
    ...data,
    id: randomUUID(),
    ownerId: user.id,
    kind,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  db.rows.push(row);
  return row;
};
export const member = (db: Database, orgId: unknown, user?: User) =>
  !!user &&
  db.rows.some(
    (r) =>
      r.kind === "organization" &&
      r.id === orgId &&
      (r.ownerId === user.id ||
        (Array.isArray(r.members) && r.members.includes(user.id))),
  );
function requireOrg(db: Database, id: unknown, user: User) {
  if (!member(db, id, user))
    throw new AppError("기업 구성원만 이용할 수 있습니다.", 403);
}
function requireProcurement(db: Database, id: unknown, user: User) {
  requireOrg(db, id, user);
  const org = db.rows.find((r) => r.id === id)!;
  if (
    org.ownerId !== user.id &&
    !["admin", "procurement"].includes(
      String(
        (org.memberRoles as Record<string, string> | undefined)?.[user.id],
      ),
    )
  )
    throw new AppError("기업 구매 담당 권한이 필요합니다.", 403);
}
function active(row: Row, now: number) {
  return (
    row.kind === "post" &&
    row.quoteEnabled &&
    row.status === "published" &&
    !row.selectedQuoteId &&
    Date.parse(String(row.expiresAt)) > now
  );
}
function provider(user: User) {
  if (user.role !== "provider")
    throw new AppError("업체 계정이 필요합니다.", 403);
}
function audit(
  db: Database,
  user: User,
  action: string,
  targetId: string,
  now: number,
) {
  add(db, user, "audit", { action, targetId }, now);
}
export function canRead(
  db: Database,
  row: Row,
  user?: User,
  now = Date.now(),
): boolean {
  if (row.kind === "post")
    return (
      row.status === "published" ||
      row.ownerId === user?.id ||
      user?.role === "admin"
    );
  if (row.kind === "provider" || row.kind === "review") return true;
  if (row.kind === "media") return canReadMedia(db, row, user, now);
  if (row.kind === "comment" && row.status === "hidden")
    return row.ownerId === user?.id || user?.role === "admin";
  if (row.kind === "comment") {
    const parent = db.rows.find((r) => r.id === row.postId);
    return !!parent && canRead(db, parent, user, now);
  }
  if (row.kind === "quote") {
    const post = db.rows.find((r) => r.id === row.postId);
    return !!user && (row.ownerId === user.id || post?.ownerId === user.id);
  }
  if (row.kind === "conversation" || row.kind === "message") {
    const conversation =
      row.kind === "conversation"
        ? row
        : db.rows.find((r) => r.id === row.conversationId);
    return (
      !!user &&
      Array.isArray(conversation?.participants) &&
      conversation.participants.includes(user.id)
    );
  }
  if (row.kind === "rfq" || row.kind === "tender")
    return row.status !== "draft" || member(db, row.orgId, user);
  if (row.kind === "proposal") {
    const rfq = db.rows.find((r) => r.id === row.rfqId);
    return !!user && (row.ownerId === user.id || member(db, rfq?.orgId, user));
  }
  if (row.kind === "bid") {
    const tender = db.rows.find((r) => r.id === row.tenderId);
    return (
      !!user &&
      (row.ownerId === user.id ||
        (!!tender?.openedAt && member(db, tender?.orgId, user)))
    );
  }
  if (row.kind === "audit") {
    const target = db.rows.find((r) => r.id === row.targetId);
    return !!target && member(db, target.orgId, user);
  }
  if (row.kind === "organization") return member(db, row.id, user);
  if (row.kind === "workplace" || row.kind === "contract")
    return member(db, row.orgId, user);
  if (row.kind === "event" && user?.role === "admin") return true;
  if (row.kind === "report" || row.kind === "verification")
    return row.ownerId === user?.id || user?.role === "admin";
  return !!user && row.ownerId === user.id;
}
export function snapshot(db: Database, user?: User) {
  const blocked = db.rows
    .filter((r) => r.kind === "block" && r.ownerId === user?.id)
    .map((r) => r.targetId);
  return {
    accounts:
      user?.role === "admin"
        ? db.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            disabled: !!u.disabled,
          }))
        : [],
    user: user ? publicUser(user) : null,
    rows: db.rows
      .filter((r) => canRead(db, r, user) && !blocked.includes(r.ownerId))
      .map((source) => {
        const r = source.category
          ? { ...source, category: normalizeCategory(String(source.category)) }
          : source;
        if (r.kind === "post" && r.quoteEnabled) {
          const quoteCount = db.rows.filter(
            (q) => q.kind === "quote" && q.postId === r.id,
          ).length;
          return {
            ...r,
            quoteCount,
            quoteState: r.selectedQuoteId
              ? "selected"
              : Date.parse(String(r.expiresAt)) <= Date.now()
                ? "expired"
                : quoteCount >= Number(r.quoteLimit)
                  ? "filled"
                  : "open",
          };
        }
        if (r.kind === "provider") {
          const safe = { ...r };
          delete safe.contact;
          const selected = db.rows.some(
            (p) =>
              p.kind === "post" &&
              p.ownerId === user?.id &&
              p.selectedProviderId === r.ownerId &&
              (!policy.requireAcceptance || p.providerAccepted),
          );
          return selected || r.ownerId === user?.id ? r : safe;
        }
        return r;
      }),
    serverTime: new Date().toISOString(),
    mode: "local",
  };
}
export function act(
  db: Database,
  user: User,
  action: string,
  input: Record<string, unknown>,
  now = Date.now(),
): Row | { ok: boolean } {
  if (
    (action.startsWith("tender.") || action.startsWith("bid.")) &&
    process.env.NODE_ENV === "production" &&
    process.env.TENDERS_ENABLED !== "true"
  )
    throw new AppError("입찰 기능이 아직 활성화되지 않았습니다.", 403);
  if (
    !flags.quotes &&
    (action.startsWith("quote.") ||
      action.startsWith("trade.") ||
      action.startsWith("selection.") ||
      input.quoteEnabled)
  )
    throw new AppError("견적 기능이 비활성화되어 있습니다.", 403);
  if (
    !flags.providers &&
    (action.startsWith("provider.") ||
      action.startsWith("verification.") ||
      action.startsWith("template."))
  )
    throw new AppError("업체 기능이 비활성화되어 있습니다.", 403);
  if (
    !flags.biz &&
    ([
      "organization.",
      "workplace.",
      "rfq.",
      "proposal.",
      "contract.",
      "tender.",
      "bid.",
    ].some((prefix) => action.startsWith(prefix)) ||
      input.audience === "business")
  )
    throw new AppError("기업 기능이 비활성화되어 있습니다.", 403);
  const get = (kind?: string) => find(db, input.id, kind);
  const update = (row: Row, data: Record<string, unknown>) =>
    Object.assign(row, data, { updatedAt: new Date(now).toISOString() });
  const emit = (event: string, targetId: string) =>
    add(db, user, "event", { event, targetId }, now);
  const notify = (ownerId: string, message: string, targetId: string) =>
    add(
      db,
      { ...user, id: ownerId },
      "notification",
      { message, targetId, read: false },
      now,
    );
  switch (action) {
    case "post.create":
    case "post.update": {
      const existing = action === "post.update" ? get("post") : undefined;
      if (existing) owned(existing, user);
      const body = required(input.body, "내용");
      const serviceMode = String(
        input.serviceMode || existing?.serviceMode || "local",
      );
      if (!["local", "online"].includes(serviceMode))
        throw new AppError("서비스 방식을 확인해주세요.");
      const region =
        serviceMode === "online"
          ? onlineRegion
          : normalizeRegion(required(input.region, "지역", 80));
      if (serviceMode === "local" && !validRegion(region))
        throw new AppError("시/도를 선택하고 지역 조합을 확인해주세요.");
      const type = String(input.type || "request");
      const category = normalizeCategory(
        type === "request"
          ? required(input.category, "카테고리", 80)
          : String(input.category || ""),
      );
      const audience = input.audience === "business" ? "business" : "consumer";
      if (
        category &&
        !(audience === "business" ? businessCategories : categories).includes(
          category,
        )
      )
        throw new AppError("카테고리를 선택해주세요.");
      if (!["request", "question", "review", "free"].includes(type))
        throw new AppError("글 종류를 확인해주세요.");
      if (audience === "business") requireOrg(db, input.orgId, user);
      const quoteEnabled = type === "request" && !!input.quoteEnabled;
      if (quoteEnabled && !existing?.quoteEnabled) {
        const requests = db.rows.filter(
          (r) => r.ownerId === user.id && active(r, now),
        );
        if (
          requests.length >= policy.activeLimit ||
          requests.filter(
            (r) => normalizeCategory(String(r.category)) === category,
          ).length >= policy.categoryActiveLimit
        )
          throw new AppError(
            "진행 중인 요청 한도에 도달했어요. 기존 요청을 확인해주세요.",
          );
      }
      if (
        !existing &&
        db.rows.some(
          (r) =>
            r.kind === "post" &&
            r.ownerId === user.id &&
            r.body === body &&
            now - Date.parse(r.createdAt) < 86400000,
        )
      )
        throw new AppError("동일한 요청이 이미 등록되어 있어요.");
      const images = Array.isArray(input.images) ? input.images : [];
      if (
        images.length > 5 ||
        images.some(
          (id) =>
            !db.rows.some(
              (r) =>
                r.kind === "media" &&
                r.id === id &&
                r.ownerId === user.id &&
                r.visibility === "public",
            ),
        )
      )
        throw new AppError("사진은 직접 업로드한 이미지 5장까지 가능합니다.");
      if (input.targetProviderId) find(db, input.targetProviderId, "provider");
      const data = {
        targetProviderId:
          input.targetProviderId || existing?.targetProviderId || null,
        body,
        title: String(input.title || body.slice(0, 48)).slice(0, 120),
        region,
        serviceMode,
        category,
        type,
        audience,
        orgId: audience === "business" ? input.orgId : null,
        quoteEnabled,
        images,
        status: existing?.status || "published",
        authorName: user.name,
        authorAvatar: user.avatar || "sun",
        ...parseSchedule(input),
        budget: input.budget ? money(input.budget) : null,
        ...(quoteEnabled && !existing?.expiresAt
          ? {
              expiresAt: new Date(
                now + policy.defaultHours * hour,
              ).toISOString(),
              quoteLimit: policy.defaultLimit,
              extensionCount: 0,
            }
          : {}),
      };
      if (existing) return update(existing, data);
      const row = add(db, user, "post", data, now);
      emit("post_created", row.id);
      if (input.targetProviderId) {
        const p = find(db, input.targetProviderId, "provider");
        notify(p.ownerId, "새로운 직접 요청이 도착했어요.", row.id);
      }
      return row;
    }
    case "post.delete": {
      const row = get("post");
      owned(row, user);
      return update(row, { status: "deleted" });
    }
    case "comment.create": {
      const post = find(db, input.postId, "post");
      if (!canRead(db, post, user) || post.status !== "published")
        throw new AppError("댓글을 작성할 수 없습니다.", 403);
      const row = add(
        db,
        user,
        "comment",
        {
          postId: post.id,
          body: required(input.body, "댓글", 2000),
          authorName: user.name,
        },
        now,
      );
      notify(post.ownerId, "새 댓글이 도착했어요.", post.id);
      emit("comment_created", row.id);
      return row;
    }
    case "comment.delete": {
      const row = get("comment");
      owned(row, user);
      db.rows = db.rows.filter((r) => r.id !== row.id);
      return { ok: true };
    }
    case "report.create": {
      const target = find(db, input.targetId);
      if (!canRead(db, target, user))
        throw new AppError("접근 권한이 없습니다.", 403);
      return add(
        db,
        user,
        "report",
        {
          targetId: target.id,
          reason: required(input.reason, "신고 사유", 1000),
          status: "pending",
        },
        now,
      );
    }
    case "block.create": {
      if (input.targetId === user.id)
        throw new AppError("본인은 차단할 수 없습니다.");
      return add(
        db,
        user,
        "block",
        { targetId: required(input.targetId, "사용자") },
        now,
      );
    }
    case "conversation.create": {
      const target = find(db, input.targetId);
      if (!canRead(db, target, user))
        throw new AppError("접근 권한이 없습니다.", 403);
      if (target.ownerId === user.id)
        throw new AppError("내 글에는 채팅을 시작할 수 없어요.");
      if (!db.users.some((u) => u.id === target.ownerId))
        throw new AppError(
          "예시 콘텐츠는 채팅을 지원하지 않아요. 직접 등록한 글로 테스트해주세요.",
        );
      if (
        db.rows.some(
          (r) =>
            r.kind === "block" &&
            ((r.ownerId === user.id && r.targetId === target.ownerId) ||
              (r.ownerId === target.ownerId && r.targetId === user.id)),
        )
      )
        throw new AppError("차단된 사용자와 채팅할 수 없습니다.", 403);
      let row = db.rows.find(
        (r) =>
          r.kind === "conversation" &&
          r.targetId === target.id &&
          Array.isArray(r.participants) &&
          r.participants.includes(user.id),
      );
      if (!row)
        row = add(
          db,
          user,
          "conversation",
          {
            targetId: target.id,
            participants: [user.id, target.ownerId],
            title: target.title || target.name || "대화",
            names: {
              [user.id]: user.name,
              [target.ownerId]: db.users.find((u) => u.id === target.ownerId)
                ?.name,
            },
          },
          now,
        );
      emit("chat_started", row.id);
      return row;
    }
    case "message.create": {
      const chat = find(db, input.conversationId, "conversation");
      if (!canRead(db, chat, user))
        throw new AppError("채팅 참여자만 이용할 수 있습니다.", 403);
      const participants = chat.participants as string[];
      if (
        db.rows.some(
          (r) =>
            r.kind === "block" &&
            participants.includes(r.ownerId) &&
            participants.includes(String(r.targetId)),
        )
      )
        throw new AppError("차단된 대화입니다.", 403);
      const row = add(
        db,
        user,
        "message",
        {
          conversationId: chat.id,
          body: required(input.body, "메시지", 4000),
          authorName: user.name,
          readBy: [user.id],
        },
        now,
      );
      for (const id of participants)
        if (id !== user.id) notify(id, "새 메시지가 도착했어요.", chat.id);
      return row;
    }
    case "conversation.read": {
      const chat = get("conversation");
      if (!canRead(db, chat, user))
        throw new AppError("접근 권한이 없습니다.", 403);
      for (const row of db.rows.filter(
        (r) => r.kind === "message" && r.conversationId === chat.id,
      ))
        row.readBy = [...new Set([...(row.readBy as string[]), user.id])];
      return { ok: true };
    }
    case "quote.viewed": {
      const post = get("post");
      if (post.ownerId === user.id)
        for (const q of db.rows.filter(
          (r) => r.kind === "quote" && r.postId === post.id && !r.viewedAt,
        )) {
          q.viewedAt = new Date(now).toISOString();
          emit("quote_viewed", q.id);
        }
      return { ok: true };
    }
    case "quote.submit": {
      provider(user);
      const post = find(db, input.postId, "post");
      if (post.ownerId === user.id)
        throw new AppError("본인 요청에 견적을 낼 수 없습니다.");
      if (!active(post, now)) throw new AppError("견적 모집이 마감되었습니다.");
      const old = db.rows.find(
        (r) =>
          r.kind === "quote" && r.postId === post.id && r.ownerId === user.id,
      );
      const count = db.rows.filter(
        (r) => r.kind === "quote" && r.postId === post.id,
      ).length;
      if (!old && count >= Number(post.quoteLimit))
        throw new AppError("견적 모집 한도에 도달했습니다.");
      const data = {
        postId: post.id,
        amount: money(input.amount),
        message: required(input.message, "한줄 설명", 1000),
        availableDate: input.availableDate || "",
        scope: String(input.scope || ""),
        duration: String(input.duration || ""),
        extraCost: String(input.extraCost || ""),
        providerName: user.name,
        currency: "KRW",
      };
      const row = old ? update(old, data) : add(db, user, "quote", data, now);
      notify(post.ownerId, "새 견적이 도착했어요.", post.id);
      emit("quote_received", row.id);
      return row;
    }
    case "quote.expand": {
      const post = get("post");
      owned(post, user);
      if (
        !post.quoteEnabled ||
        post.selectedQuoteId ||
        post.status !== "published" ||
        Date.parse(String(post.expiresAt)) <= now
      )
        throw new AppError("진행 중인 요청만 추가 모집할 수 있어요.");
      return update(post, { quoteLimit: policy.maxLimit });
    }
    case "quote.extend": {
      const post = get("post");
      owned(post, user);
      if (
        !post.quoteEnabled ||
        post.selectedQuoteId ||
        post.status !== "published" ||
        Number(post.extensionCount) >= policy.maxExtensions
      )
        throw new AppError("더 이상 연장할 수 없습니다.");
      const expires = Math.min(
        Date.parse(String(post.expiresAt)) + policy.extensionHours * hour,
        Date.parse(post.createdAt) + policy.maxHours * hour,
      );
      if (expires <= now) throw new AppError("최대 모집기간이 지났습니다.");
      return update(post, {
        expiresAt: new Date(expires).toISOString(),
        extensionCount: Number(post.extensionCount) + 1,
      });
    }
    case "quote.select": {
      const quote = get("quote");
      const post = find(db, quote.postId, "post");
      owned(post, user);
      if (post.selectedQuoteId || post.status !== "published")
        throw new AppError("이미 선택했거나 종료된 요청입니다.");
      update(post, {
        selectedQuoteId: quote.id,
        selectedProviderId: quote.ownerId,
        selectedAt: new Date(now).toISOString(),
      });
      notify(quote.ownerId, "고객님이 업체를 선택했어요.", post.id);
      emit("provider_selected", post.id);
      return post;
    }
    case "selection.accept": {
      const post = get("post");
      if (post.selectedProviderId !== user.id)
        throw new AppError("선택된 업체만 수락할 수 있습니다.", 403);
      return update(post, { providerAccepted: true });
    }
    case "trade.confirm": {
      const post = get("post");
      if (!post.selectedProviderId)
        throw new AppError("업체 선택이 필요합니다.");
      if (post.ownerId === user.id)
        update(post, { customerConfirmed: !!input.confirmed });
      else if (post.selectedProviderId === user.id)
        update(post, {
          providerConfirmed: !!input.confirmed,
          providerAccepted: true,
        });
      else throw new AppError("거래 참여자만 확인할 수 있습니다.", 403);
      if (post.customerConfirmed && post.providerConfirmed)
        update(post, {
          completedAt: post.completedAt || new Date(now).toISOString(),
        });
      else update(post, { completedAt: null });
      emit("trade_confirmed", post.id);
      return post;
    }
    case "review.create": {
      const post = get("post");
      owned(post, user);
      if (!post.customerConfirmed)
        throw new AppError("실제 거래 확인 후 후기를 작성해주세요.");
      if (db.rows.some((r) => r.kind === "review" && r.postId === post.id))
        throw new AppError("이미 후기를 작성했어요.");
      const rating = Number(input.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5)
        throw new AppError("평점은 1~5입니다.");
      return add(
        db,
        user,
        "review",
        {
          postId: post.id,
          providerId: post.selectedProviderId,
          rating,
          body: required(input.body, "후기"),
          authorName: user.name,
        },
        now,
      );
    }
    case "template.save": {
      provider(user);
      return add(
        db,
        user,
        "template",
        {
          name: required(input.name, "템플릿 이름", 80),
          message: required(input.message, "설명"),
          scope: String(input.scope || ""),
          amount: money(input.amount),
        },
        now,
      );
    }
    case "provider.save": {
      provider(user);
      const old = db.rows.find(
        (r) => r.kind === "provider" && r.ownerId === user.id,
      );
      const data = {
        name: required(input.name, "업체명", 80),
        intro: required(input.intro, "소개", 2000),
        region: required(input.region, "지역", 80),
        category: required(input.category, "서비스", 80),
        contact: required(input.contact, "연락처", 120),
        portfolio: String(input.portfolio || ""),
        verification: old?.verification || "unverified",
      };
      return old ? update(old, data) : add(db, user, "provider", data, now);
    }
    case "verification.request": {
      provider(user);
      const profile = db.rows.find(
        (r) => r.kind === "provider" && r.ownerId === user.id,
      );
      if (!profile) throw new AppError("업체 프로필을 먼저 등록해주세요.");
      update(profile, { verification: "pending" });
      return add(
        db,
        user,
        "verification",
        {
          profileId: profile.id,
          note: required(input.note, "확인 요청 내용"),
          status: "pending",
        },
        now,
      );
    }
    case "profile.enableProvider": {
      if (user.role !== "admin") user.role = "provider";
      return { ok: true };
    }
    case "profile.update": {
      const name = required(input.name, "닉네임", 20);
      const avatar = required(input.avatar, "아바타", 80);
      const photo = avatar.startsWith("media:")
        ? db.rows.find(
            (r) =>
              r.id === avatar.slice(6) &&
              r.kind === "media" &&
              r.ownerId === user.id &&
              r.visibility === "public" &&
              ["image/jpeg", "image/png", "image/webp"].includes(
                String(r.mime),
              ),
          )
        : undefined;
      if (!["sun", "leaf", "smile"].includes(avatar) && !photo)
        throw new AppError("아바타를 다시 선택해주세요.");
      const region = input.region
        ? normalizeRegion(required(input.region, "지역", 80))
        : "";
      if (region && !validRegion(region))
        throw new AppError("지역을 올바르게 선택해주세요.");
      user.name = name;
      user.avatar = avatar;
      user.region = region;
      for (const row of db.rows) {
        if (row.ownerId === user.id && "authorName" in row) {
          row.authorName = name;
          row.authorAvatar = avatar;
        }
        if (
          row.kind === "conversation" &&
          row.names &&
          typeof row.names === "object" &&
          user.id in row.names
        )
          (row.names as Record<string, string>)[user.id] = name;
      }
      return { ok: true };
    }
    case "profile.region": {
      const region = normalizeRegion(required(input.region, "지역", 80));
      if (!validRegion(region))
        throw new AppError("지역을 올바르게 선택해주세요.");
      user.region = region;
      return { ok: true };
    }
    case "organization.addMember": {
      const org = get("organization");
      owned(org, user);
      const email = required(input.email, "회원 이메일", 254).toLowerCase();
      const target = db.users.find((u) => u.email === email);
      if (!target) throw new AppError("먼저 가입한 회원만 추가할 수 있습니다.");
      if (!["admin", "member", "procurement"].includes(String(input.role)))
        throw new AppError("구성원 역할을 확인해주세요.");
      org.members = [
        ...new Set([...((org.members as string[]) || []), target.id]),
      ];
      org.memberRoles = {
        ...((org.memberRoles as Record<string, string>) || {}),
        [target.id]: input.role,
      };
      return org;
    }
    case "organization.verifyRequest": {
      const org = get("organization");
      owned(org, user);
      update(org, { verification: "pending" });
      return add(
        db,
        user,
        "verification",
        {
          orgId: org.id,
          note: required(input.note, "확인 요청 내용"),
          status: "pending",
        },
        now,
      );
    }
    case "organization.create":
      return add(
        db,
        user,
        "organization",
        {
          name: required(input.name, "기업명", 100),
          members: [],
          verification: "unverified",
        },
        now,
      );
    case "workplace.create": {
      requireOrg(db, input.orgId, user);
      return add(
        db,
        user,
        "workplace",
        {
          orgId: input.orgId,
          name: required(input.name, "사업장명", 100),
          region: required(input.region, "지역", 100),
        },
        now,
      );
    }
    case "rfq.create":
    case "tender.create": {
      requireProcurement(db, input.orgId, user);
      const deadline = iso(input.deadline);
      if (Date.parse(deadline) <= now)
        throw new AppError("마감일은 현재 이후로 선택해주세요.");
      const tender = action === "tender.create";
      const start = tender
        ? iso(input.startAt || new Date(now).toISOString())
        : undefined;
      if (start && Date.parse(start) >= Date.parse(deadline))
        throw new AppError("시작일은 마감일보다 앞서야 합니다.");
      return add(
        db,
        user,
        tender ? "tender" : "rfq",
        {
          orgId: input.orgId,
          title: required(input.title, "제목", 120),
          body: required(input.body, "업무범위"),
          category: required(input.category, "카테고리", 80),
          region: required(input.region, "지역", 80),
          deadline,
          status: tender ? "draft" : "published",
          eligibility: String(input.eligibility || ""),
          evaluation: String(input.evaluation || ""),
          ...(start ? { startAt: start } : {}),
        },
        now,
      );
    }
    case "proposal.submit": {
      provider(user);
      const rfq = find(db, input.rfqId, "rfq");
      if (member(db, rfq.orgId, user))
        throw new AppError("발주기업은 제안할 수 없습니다.");
      if (Date.parse(String(rfq.deadline)) <= now || rfq.status !== "published")
        throw new AppError("제안 접수가 마감되었습니다.");
      const old = db.rows.find(
        (r) =>
          r.kind === "proposal" && r.rfqId === rfq.id && r.ownerId === user.id,
      );
      const data = {
        rfqId: rfq.id,
        amount: money(input.amount),
        body: required(input.body, "제안 내용"),
        duration: required(input.duration, "수행기간", 100),
        providerName: user.name,
      };
      return old ? update(old, data) : add(db, user, "proposal", data, now);
    }
    case "contract.renew": {
      const contract = get("contract");
      requireProcurement(db, contract.orgId, user);
      const end = iso(input.endAt);
      if (Date.parse(end) <= Date.parse(String(contract.endAt)))
        throw new AppError("갱신 종료일은 기존 종료일 이후여야 합니다.");
      return update(contract, {
        previousEndAt: contract.endAt,
        endAt: end,
        renewedAt: new Date(now).toISOString(),
      });
    }
    case "contract.create": {
      requireProcurement(db, input.orgId, user);
      const workplace = find(db, input.workplaceId, "workplace");
      if (workplace.orgId !== input.orgId)
        throw new AppError("기업 사업장을 확인해주세요.", 403);
      const start = iso(input.startAt),
        end = iso(input.endAt);
      if (start >= end) throw new AppError("계약기간을 확인해주세요.");
      return add(
        db,
        user,
        "contract",
        {
          orgId: input.orgId,
          workplaceId: workplace.id,
          name: required(input.name, "계약명", 100),
          providerName: required(input.providerName, "담당 업체", 100),
          startAt: start,
          endAt: end,
          inspectionAt: input.inspectionAt ? iso(input.inspectionAt) : null,
          status: "active",
        },
        now,
      );
    }
    case "tender.publish": {
      const tender = get("tender");
      requireProcurement(db, tender.orgId, user);
      if (
        tender.status !== "draft" ||
        Date.parse(String(tender.deadline)) <= now
      )
        throw new AppError("공고를 게시할 수 없습니다.");
      required(tender.evaluation, "선정방식");
      required(tender.eligibility, "참가조건");
      update(tender, { status: "published" });
      audit(db, user, action, tender.id, now);
      return tender;
    }
    case "bid.submit":
    case "bid.withdraw": {
      provider(user);
      const tender = find(db, input.tenderId, "tender");
      if (member(db, tender.orgId, user))
        throw new AppError("발주기업은 투찰할 수 없습니다.");
      if (
        tender.status !== "published" ||
        now < Date.parse(String(tender.startAt)) ||
        now >= Date.parse(String(tender.deadline))
      )
        throw new AppError("투찰 가능한 시간이 아닙니다.");
      const old = db.rows.find(
        (r) =>
          r.kind === "bid" && r.tenderId === tender.id && r.ownerId === user.id,
      );
      if (action === "bid.withdraw") {
        if (!old) throw new AppError("제출한 투찰이 없습니다.");
        update(old, { status: "withdrawn" });
        audit(db, user, action, tender.id, now);
        return old;
      }
      const versions = (old?.versions as Record<string, unknown>[]) || [];
      const version = {
        version: versions.length + 1,
        amount: money(input.amount),
        body: required(input.body, "제안 내용"),
        submittedAt: new Date(now).toISOString(),
      };
      const row = old
        ? update(old, { versions: [...versions, version], status: "submitted" })
        : add(
            db,
            user,
            "bid",
            {
              tenderId: tender.id,
              providerName: user.name,
              versions: [version],
              status: "submitted",
            },
            now,
          );
      audit(db, user, action, tender.id, now);
      return row;
    }
    case "tender.open": {
      const tender = get("tender");
      requireProcurement(db, tender.orgId, user);
      if (
        tender.status !== "published" ||
        now < Date.parse(String(tender.deadline))
      )
        throw new AppError("마감 후에만 개찰할 수 있습니다.");
      update(tender, {
        status: "opened",
        openedAt: new Date(now).toISOString(),
      });
      audit(db, user, action, tender.id, now);
      return tender;
    }
    case "tender.award": {
      const tender = get("tender");
      requireProcurement(db, tender.orgId, user);
      if (tender.status !== "opened")
        throw new AppError("개찰 후 선정할 수 있습니다.");
      const bid = find(db, input.bidId, "bid");
      if (bid.tenderId !== tender.id || bid.status !== "submitted")
        throw new AppError("유효한 투찰을 선택해주세요.");
      update(tender, {
        status: "awarded",
        selectedBidId: bid.id,
        evaluationNote: required(input.note, "평가 내용"),
      });
      audit(db, user, action, tender.id, now);
      return tender;
    }
    case "tender.close": {
      const tender = get("tender");
      requireProcurement(db, tender.orgId, user);
      if (
        ["awarded", "cancelled", "failed", "no_award"].includes(
          String(tender.status),
        )
      )
        throw new AppError("이미 종료된 입찰입니다.");
      if (!["cancelled", "failed", "no_award"].includes(String(input.status)))
        throw new AppError("종료 상태를 확인해주세요.");
      if (input.status !== "cancelled" && !tender.openedAt)
        throw new AppError("개찰 후 처리해주세요.");
      update(tender, {
        status: input.status,
        closeReason: required(input.note, "종료 사유"),
      });
      audit(db, user, action, tender.id, now);
      return tender;
    }
    case "notification.read": {
      const row = get("notification");
      owned(row, user);
      return update(row, { read: true });
    }
    case "admin.account": {
      if (user.role !== "admin")
        throw new AppError("관리자 권한이 필요합니다.", 403);
      const target = db.users.find((u) => u.id === input.id);
      if (!target || target.id === user.id)
        throw new AppError("변경할 계정을 확인해주세요.");
      target.disabled = !!input.disabled;
      return { ok: true };
    }
    case "admin.moderate": {
      if (user.role !== "admin")
        throw new AppError("관리자 권한이 필요합니다.", 403);
      const row = get();
      if (row.kind === "comment")
        return update(row, {
          status: input.status === "published" ? "published" : "hidden",
        });
      if (row.kind === "post")
        return update(row, {
          status: input.status === "published" ? "published" : "hidden",
        });
      if (row.kind === "verification") {
        if (!["verified", "rejected", "expired"].includes(String(input.status)))
          throw new AppError("확인 상태를 선택해주세요.");
        const profile = row.orgId
          ? find(db, row.orgId, "organization")
          : find(db, row.profileId, "provider");
        update(profile, { verification: input.status });
        return update(row, {
          status: input.status,
          checkedBy: user.id,
          checkedAt: new Date(now).toISOString(),
        });
      }
      if (row.kind === "report") return update(row, { status: "resolved" });
      throw new AppError("지원하지 않는 관리 작업입니다.");
    }
    default:
      throw new AppError("지원하지 않는 작업입니다.", 400);
  }
}

export function canReadMedia(
  db: Database,
  row: Row,
  user?: User,
  now = Date.now(),
): boolean {
  if (row.visibility === "public" || row.ownerId === user?.id) return true;
  if (!user) return false;
  const target = db.rows.find((r) => r.id === row.targetId);
  if (!target) return false;
  if (target.kind === "rfq" || target.kind === "tender")
    return (
      member(db, target.orgId, user) ||
      (user.role === "provider" && target.status !== "draft")
    );
  return canRead(db, target, user, now);
}
