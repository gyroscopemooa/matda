import type { SupabaseClient, User as Identity } from "@supabase/supabase-js";
import { AppError, type Database, type Row, type User } from "./types";
import { act, snapshot } from "./domain";

export const remoteEnabled = () => process.env.DATA_ADAPTER === "supabase";
type RecordRow = Record<string, unknown>;
function checked<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    console.error("Community database request failed", result.error.message);
    throw new AppError(
      "데이터를 처리하지 못했어요. 연결 설정을 확인하고 다시 시도해주세요.",
      503,
    );
  }
  return result.data;
}
export async function identityFor(client: SupabaseClient) {
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError")
    throw new AppError(
      "로그인 상태를 확인하지 못했어요. 다시 로그인해주세요.",
      401,
    );
  return data.user;
}
export async function ensureProfile(
  client: SupabaseClient,
  identity: Identity,
) {
  const existing = checked(
    await client
      .from("profiles")
      .select("*")
      .eq("id", identity.id)
      .maybeSingle(),
  );
  if (existing) {
    if (existing.disabled) throw new AppError("이용이 제한된 계정입니다.", 403);
    return existing;
  }
  const previous = identity.user_metadata.haejyo_profile;
  const name =
    String(previous?.name || identity.user_metadata.nickname || "새 이웃")
      .trim()
      .slice(0, 20) || "새 이웃";
  checked(
    await client.from("profiles").upsert(
      {
        id: identity.id,
        display_name: name,
        region: String(previous?.region || "").slice(0, 80),
        avatar: ["sun", "leaf", "smile"].includes(previous?.avatar)
          ? previous.avatar
          : "sun",
      },
      { onConflict: "id", ignoreDuplicates: true },
    ),
  );
  return checked(
    await client.from("profiles").select("*").eq("id", identity.id).single(),
  );
}
const row = (kind: string, r: RecordRow, owner: string): Row => ({
  ...r,
  id: String(r.id),
  kind,
  ownerId: owner,
  createdAt: String(r.created_at || new Date().toISOString()),
  updatedAt: String(r.created_at || new Date().toISOString()),
});
export async function loadCommunity(
  client: SupabaseClient,
  identity: Identity | null,
): Promise<{ db: Database; user?: User }> {
  if (identity) await ensureProfile(client, identity);
  const tables = [
    "profiles",
    "posts",
    "comments",
    ...(identity
      ? [
          "media",
          "conversations",
          "conversation_members",
          "messages",
          "notifications",
          "blocks",
          "reports",
        ]
      : []),
  ];
  const results = await Promise.all(
    tables.map(async (table) => {
      const records: RecordRow[] = [];
      for (let offset = 0; ; offset += 500) {
        let query = client.from(table).select("*");
        const keys =
          table === "blocks"
            ? ["owner_id", "target_id"]
            : table === "conversation_members"
              ? ["conversation_id", "user_id"]
              : ["id"];
        for (const key of keys) query = query.order(key);
        const page = checked(await query.range(offset, offset + 499)) || [];
        records.push(...page);
        if (page.length < 500) break;
      }
      return { data: records, error: null };
    }),
  );
  const lists: Record<string, RecordRow[]> = {};
  results.forEach((result, i) => {
    lists[tables[i]] = checked(result) || [];
  });
  const isAdmin = identity
    ? checked(await client.rpc("community_admin")) === true
    : false;
  const users: User[] = lists.profiles.map((p) => ({
    id: String(p.id),
    name: String(p.display_name),
    email: p.id === identity?.id ? identity?.email || "" : "",
    password: "",
    role: p.id === identity?.id && isAdmin ? "admin" : "customer",
    region: String(p.region),
    avatar: String(p.avatar || "sun"),
    disabled: !!p.disabled,
    createdAt: String(p.created_at),
  }));
  const people = new Map(users.map((u) => [u.id, u]));
  const author = (id: unknown) => ({
    authorName: people.get(String(id))?.name || "이웃",
    authorAvatar: people.get(String(id))?.avatar || "sun",
  });
  const rows: Row[] = [];
  for (const p of lists.posts) {
    const schedule = (p.schedule || {}) as RecordRow;
    rows.push({
      ...row("post", p, String(p.author_id)),
      ...author(p.author_id),
      sample: !!p.is_sample,
      ...(p.is_sample
        ? { authorName: "해죠 운영팀", authorAvatar: "sun" }
        : {}),
      communitySector: p.community_sector || "personal",
      communityPurpose: p.community_purpose || "general",
      type: p.post_type,
      category: p.category_id || "",
      serviceMode: p.service_mode || "local",
      images: p.images || [],
      quoteEnabled: false,
      scheduleMode: schedule.scheduleMode,
      desiredDate: schedule.desiredDate,
      desiredEndDate: schedule.desiredEndDate,
    });
  }
  for (const c of lists.comments)
    rows.push({
      ...row("comment", c, String(c.author_id)),
      ...author(c.author_id),
      postId: c.post_id,
    });
  for (const m of lists.media || [])
    rows.push({
      ...row("media", m, String(m.owner_id)),
      name: "사진",
      targetId: m.post_id || "",
    });
  for (const c of lists.conversations || []) {
    const members = (lists.conversation_members || []).filter(
      (m) => m.conversation_id === c.id,
    );
    rows.push({
      ...row("conversation", c, String(c.created_by)),
      targetId: c.post_id,
      closedAt: c.closed_at,
      closedBy: c.closed_by,
      title:
        lists.posts.find((p) => p.id === c.post_id)?.title || "이웃과의 대화",
      participants: members.map((m) => m.user_id),
      leftAtBy: Object.fromEntries(
        members
          .filter((m) => m.left_at)
          .map((m) => [String(m.user_id), String(m.left_at)]),
      ),
      names: Object.fromEntries(
        members.map((m) => [
          String(m.user_id),
          people.get(String(m.user_id))?.name || "이웃",
        ]),
      ),
    });
  }
  for (const m of lists.messages || [])
    rows.push({
      ...row("message", m, String(m.sender_id)),
      ...author(m.sender_id),
      conversationId: m.conversation_id,
      readBy: (lists.conversation_members || [])
        .filter(
          (p) =>
            p.conversation_id === m.conversation_id &&
            (p.user_id === m.sender_id ||
              (p.last_read_at &&
                Date.parse(String(p.last_read_at)) >=
                  Date.parse(String(m.created_at)))),
        )
        .map((p) => p.user_id),
    });
  for (const n of lists.notifications || [])
    rows.push({
      ...row("notification", n, String(n.user_id)),
      read: !!n.read_at,
      targetId: n.target_id,
      sourceId: n.source_id,
    });
  for (const b of lists.blocks || [])
    rows.push({
      ...row(
        "block",
        { ...b, id: `${b.owner_id}:${b.target_id}` },
        String(b.owner_id),
      ),
      targetId: b.target_id,
    });
  for (const r of lists.reports || [])
    rows.push({
      ...row("report", r, String(r.reporter_id)),
      targetId: r.target_id,
    });
  rows.sort(
    (a, b) =>
      Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
  return {
    db: { users, sessions: [], rows },
    user: users.find((u) => u.id === identity?.id),
  };
}
export function communitySnapshot(db: Database, user?: User) {
  return { ...snapshot(db, user), mode: "supabase" };
}
export async function communityAction(
  client: SupabaseClient,
  db: Database,
  user: User,
  action: string,
  input: Record<string, unknown>,
) {
  if (user.disabled) throw new AppError("이용이 제한된 계정입니다.", 403);
  if (action === "conversation.create") {
    const id = checked(
      await client.rpc("community_start_chat", { target: input.targetId }),
    );
    checked(await client.rpc("community_read_chat", { target: id }));
    return { id };
  }
  if (action === "conversation.leave") {
    checked(await client.rpc("community_leave_chat", { target: input.id }));
    return { ok: true };
  }
  if (action === "conversation.close") {
    checked(await client.rpc("community_close_chat", { target: input.id }));
    return { ok: true };
  }
  if (action === "conversation.read") {
    checked(await client.rpc("community_read_chat", { target: input.id }));
    return { ok: true };
  }
  const allowed = [
    "post.create",
    "post.update",
    "post.delete",
    "comment.create",
    "comment.delete",
    "profile.update",
    "profile.region",
    "message.create",
    "notification.read",
    "block.create",
    "report.create",
    "admin.account",
    "admin.moderate",
  ];
  if (!allowed.includes(action))
    throw new AppError("현재 공개 단계에서 지원하지 않는 기능입니다.", 400);
  if (
    action.startsWith("post.") &&
    (input.quoteEnabled || input.audience === "business")
  )
    throw new AppError("현재는 커뮤니티 글만 등록할 수 있어요.");
  const result = act(db, user, action, input);
  const r = result as Row;
  switch (action) {
    case "profile.update":
    case "profile.region":
      checked(
        await client
          .from("profiles")
          .update({
            display_name: user.name,
            region: user.region,
            avatar: user.avatar || "sun",
          })
          .eq("id", user.id)
          .select("id")
          .single(),
      );
      break;
    case "post.create":
    case "post.update": {
      const values = {
        author_id: user.id,
        post_type: r.type,
        audience: "consumer",
        ...(r.communitySector === "business" || "community_sector" in r
          ? {
              community_sector: r.communitySector || "personal",
              community_purpose: r.communityPurpose || "general",
            }
          : {}),
        category_id: r.category || null,
        title: r.title,
        body: r.body,
        region: r.region,
        service_mode: r.serviceMode || "local",
        images: r.images,
        budget: r.budget,
        schedule: {
          scheduleMode: r.scheduleMode,
          desiredDate: r.desiredDate,
          desiredEndDate: r.desiredEndDate,
        },
      };
      const query =
        action === "post.create"
          ? client.from("posts").insert({ ...values, id: r.id })
          : client
              .from("posts")
              .update(values)
              .eq("id", r.id)
              .eq("author_id", user.id);
      checked(await query.select("id").single());
      break;
    }
    case "post.delete":
      checked(
        await client
          .from("posts")
          .update({ status: "deleted" })
          .eq("id", input.id)
          .eq("author_id", user.id)
          .select("id")
          .single(),
      );
      break;
    case "comment.create":
      checked(
        await client.from("comments").insert({
          id: r.id,
          post_id: r.postId,
          author_id: user.id,
          body: r.body,
        }),
      );
      break;
    case "comment.delete":
      checked(
        await client
          .from("comments")
          .delete()
          .eq("id", input.id)
          .eq("author_id", user.id)
          .select("id")
          .single(),
      );
      break;
    case "message.create":
      checked(
        await client.from("messages").insert({
          id: r.id,
          conversation_id: r.conversationId,
          sender_id: user.id,
          body: r.body,
        }),
      );
      break;
    case "notification.read":
      checked(
        await client
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", input.id)
          .eq("user_id", user.id)
          .select("id")
          .single(),
      );
      break;
    case "block.create":
      checked(
        await client
          .from("blocks")
          .upsert({ owner_id: user.id, target_id: input.targetId }),
      );
      break;
    case "report.create":
      checked(
        await client.from("reports").insert({
          id: r.id,
          reporter_id: user.id,
          target_id: input.targetId,
          reason: r.reason,
        }),
      );
      break;
    case "admin.account":
      checked(
        await client.rpc("community_moderate", {
          target: input.id,
          kind: "account",
          state: input.disabled ? "disabled" : "enabled",
        }),
      );
      break;
    case "admin.moderate": {
      const target = db.rows.find((item) => item.id === input.id);
      checked(
        await client.rpc("community_moderate", {
          target: input.id,
          kind: target?.kind,
          state: target?.kind === "report" ? "resolved" : input.status,
        }),
      );
      break;
    }
  }
  return result;
}
