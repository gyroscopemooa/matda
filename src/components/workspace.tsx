"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import PostKindPicker from "./post-kind-picker";
import { popularPosts } from "@/lib/popular";
import RegionPicker from "./region-picker";
import SchedulePicker from "./schedule-picker";
import { scheduleLabel } from "@/lib/schedule";
import { matchesRegion } from "@/lib/regions";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  ArrowUpRight,
  ArrowRight,
  Plus,
  House,
  MessageCircle,
  UserRound,
  Bell,
  ChevronRight,
  X,
  Check,
  ShieldCheck,
  Building2,
  BriefcaseBusiness,
  Truck,
  PaintRoller,
  Wrench,
  Car,
  Sparkles,
  Ellipsis,
  Heart,
  ImagePlus,
  Send,
  FileText,
  SlidersHorizontal,
  LogOut,
  Leaf,
  Flame,
  Zap,
  HardHat,
  ClipboardCheck,
} from "lucide-react";
import {
  siteConfig,
  flags,
  categories,
  businessCategories,
  postTypes,
} from "@/lib/config";
import type { Row, PublicUser } from "@/lib/types";
type Snapshot = {
  user: PublicUser | null;
  rows: Row[];
  mode: string;
  accounts?: {
    id: string;
    name: string;
    email: string;
    role: string;
    disabled: boolean;
  }[];
};
type Field = {
  category?: string;
  biz?: boolean;
  start?: string;
  end?: string;
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
  value?: string;
};
const icons = [Sparkles, Truck, Wrench, PaintRoller, Car, Ellipsis];
const bizIcons = [HardHat, Zap, Flame, Building2, Leaf, ClipboardCheck];
const str = (v: unknown) => String(v ?? "");
const currency = (v: unknown) => Number(v || 0).toLocaleString("ko-KR") + "원";
const date = (v: unknown) => new Date(str(v)).toLocaleDateString("ko-KR");
const typeLabel = (v: unknown) =>
  postTypes[v as keyof typeof postTypes] || str(v);
function FieldInput({ field }: { field: Field }) {
  if (field.key === "type")
    return (
      <PostKindPicker
        value={field.value}
        category={field.category}
        biz={field.biz}
      />
    );
  if (field.key === "scheduleMode")
    return (
      <SchedulePicker mode={field.value} start={field.start} end={field.end} />
    );
  if (field.key === "region")
    return (
      <RegionPicker
        name={field.key}
        value={field.value}
        required={field.required}
      />
    );
  return (
    <label className="field">
      {field.label}
      {field.required && <span className="required"> *</span>}
      {field.options ? (
        <select
          name={field.key}
          defaultValue={field.value}
          required={field.required}
        >
          {field.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          name={field.key}
          defaultValue={field.value}
          required={field.required}
          rows={4}
          maxLength={5000}
        />
      ) : (
        <input
          name={field.key}
          type={field.type || "text"}
          defaultValue={field.value}
          required={field.required}
          min={field.type === "number" ? 0 : undefined}
          maxLength={field.type === "password" ? 128 : 500}
        />
      )}
    </label>
  );
}
export default function Workspace() {
  const path = usePathname();
  const router = useRouter();
  const biz = path.startsWith("/biz");
  const [data, setData] = useState<Snapshot>({
    user: null,
    rows: [],
    mode: "local",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("전체 지역");
  const [category, setCategory] = useState("전체");
  const [type, setType] = useState("전체");
  const [modal, setModal] = useState<null | {
    title: string;
    fields: Field[];
    submit: (values: Record<string, string>) => Promise<void>;
    extra?: ReactNode;
    button?: string;
  }>(null);
  const [compared, setCompared] = useState<string[]>([]);
  const [signup, setSignup] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const imagesRef = useRef<string[]>([]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const rows = data.rows,
    user = data.user;
  const own = (kind: string) =>
    rows.filter((r) => r.kind === kind && r.ownerId === user?.id);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/app", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const saved = localStorage.getItem("matda-region");
    if (saved) setRegion(saved);
  }, [refresh]);
  useEffect(() => {
    setCategory("전체");
    setType("전체");
    setSearch("");
  }, [biz]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (modal || authOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [modal, authOpen]);
  useEffect(() => {
    if (!path.startsWith("/chat")) return;
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [path, refresh]);
  async function action(name: string, input: Record<string, unknown> = {}) {
    if (!user) {
      setAuthOpen(true);
      throw new Error("로그인 후 이용해주세요.");
    }
    const response = await fetch("/api/app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: name, input }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setData(payload);
    return payload.result as Row;
  }
  async function run(fn: () => Promise<unknown>, message = "저장했어요.") {
    setBusy(true);
    try {
      await fn();
      if (message) setToast(message);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openForm(
    title: string,
    fields: Field[],
    submit: (v: Record<string, string>) => Promise<void>,
    button = "저장하기",
    requiresLogin = true,
  ) {
    if (requiresLogin && !user) {
      setAuthOpen(true);
      return;
    }
    setModal({ title, fields, submit, button });
  }
  function createPost(existing?: Row, targetProviderId?: string) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setImages((existing?.images as string[]) || []);
    openForm(
      existing
        ? "글 수정하기"
        : biz
          ? "기업에 필요한 업체를 찾아보세요"
          : "어떤 이야기를 나누고 싶으세요?",
      [
        {
          key: "type",
          label: "글 종류",
          options: ["해줘요", "질문", "후기", "자유"],
          value: existing ? typeLabel(existing.type) : "해줘요",
          category: str(
            existing?.category || (biz ? businessCategories[0] : categories[0]),
          ),
          biz,
        },
        { key: "title", label: "제목 (선택)", value: str(existing?.title) },
        {
          key: "body",
          label: "내용",
          type: "textarea",
          required: true,
          value: str(existing?.body),
        },
        {
          key: "region",
          label: "지역",
          required: true,
          value: str(
            existing?.region || (region !== "전체 지역" ? region : user.region),
          ),
        },
        ...(flags.quotes
          ? [
              {
                key: "quoteEnabled",
                label: "업체 견적 받기",
                options: ["받지 않기", "견적 받기"],
                value: existing?.quoteEnabled ? "견적 받기" : "받지 않기",
              },
            ]
          : []),
        {
          key: "scheduleMode",
          label: "희망 일정 (선택)",
          value: str(
            existing?.scheduleMode ||
              (existing?.desiredDate ? "date" : "flexible"),
          ),
          start: str(existing?.desiredDate),
          end: str(existing?.desiredEndDate),
        },
        {
          key: "budget",
          label: "예산 (선택)",
          type: "number",
          value: str(existing?.budget),
        },
        ...(biz
          ? [
              {
                key: "orgId",
                label: "기업",
                options: rows
                  .filter((r) => r.kind === "organization")
                  .map((o) => str(o.name)),
                required: true,
              },
            ]
          : []),
      ],
      async (values) => {
        const selectedImages = imagesRef.current;
        const result = await action(existing ? "post.update" : "post.create", {
          ...values,
          id: existing?.id,
          type: Object.entries(postTypes).find(
            ([, v]) => v === values.type,
          )?.[0],
          quoteEnabled: flags.quotes && values.quoteEnabled === "견적 받기",
          audience: biz ? "business" : "consumer",
          orgId: rows
            .filter((r) => r.kind === "organization")
            .find((o) => o.name === values.orgId)?.id,
          images: selectedImages,
          targetProviderId,
        });
        router.push("/posts/" + result.id);
      },
      "그냥 등록",
    );
  }
  async function upload(file: File, targetId?: string) {
    let sendFile = file;
    if (file.type.startsWith("image/")) {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", 0.8),
      );
      if (blob)
        sendFile = new File([blob], "photo.webp", { type: "image/webp" });
    }
    const form = new FormData();
    form.set("file", sendFile);
    form.set("visibility", "public");
    if (targetId) form.set("targetId", targetId);
    const response = await fetch("/api/media", { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    if (targetId) await refresh();
    else setImages((prev) => [...prev, result.media.id].slice(0, 5));
  }
  const selectedPost = path.startsWith("/posts/")
    ? rows.find((r) => r.kind === "post" && r.id === path.split("/")[2])
    : undefined;
  useEffect(() => {
    if (flags.quotes && user?.id && path.startsWith("/posts/"))
      void fetch("/api/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quote.viewed",
          input: { id: path.split("/")[2] },
        }),
      });
  }, [path, user?.id]);
  function chat(target: Row) {
    run(async () => {
      const result = await action("conversation.create", {
        targetId: target.id,
      });
      router.push("/chat/" + result.id);
    }, "");
  }
  const nav = [
    { href: "/", label: "홈" },
    { href: "/community", label: "커뮤니티" },
    { href: "/quotes", label: "견적받기" },
    { href: "/providers", label: "업체찾기" },
    { href: "/biz", label: "기업서비스", badge: "BIZ" },
  ].filter((n) =>
    n.href === "/quotes"
      ? flags.quotes
      : n.href === "/providers"
        ? flags.providers
        : n.href === "/biz"
          ? flags.biz
          : true,
  );
  const posts = rows
    .filter(
      (r) =>
        r.kind === "post" &&
        r.status === "published" &&
        r.audience === (biz ? "business" : "consumer") &&
        (category === "전체" || r.category === category) &&
        matchesRegion(str(r.region), region) &&
        (type === "전체" || typeLabel(r.type) === type) &&
        (!path.startsWith("/quotes") || r.quoteEnabled) &&
        [r.title, r.body, r.category, r.region]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  function card(post: Row) {
    const comments = rows.filter(
      (r) => r.kind === "comment" && r.postId === post.id,
    ).length;
    return (
      <article className="post-card" key={post.id}>
        <div className="post-top">
          <span className={"badge " + str(post.type)}>
            {typeLabel(post.type)}
          </span>
          <span className="muted">
            {post.sample ? "예시 이야기" : date(post.createdAt)}
          </span>
        </div>
        <Link className="post-link" href={"/posts/" + post.id}>
          <h3>{str(post.title)}</h3>
          <p>{str(post.body)}</p>
        </Link>
        {Array.isArray(post.images) && post.images.length > 0 && (
          <div className="photo-strip">
            {post.images.map((id) => (
              <img
                key={str(id)}
                src={"/api/media?id=" + id}
                alt="게시글 첨부 사진"
              />
            ))}
          </div>
        )}
        <div className="post-bottom">
          <span className="avatar">{str(post.authorName).slice(0, 1)}</span>
          <span>{str(post.authorName)}</span>
          <span className="location">
            <MapPin size={13} />
            {str(post.region)}
          </span>
          <span>
            <MessageCircle size={14} />
            {comments}
          </span>
          {flags.quotes && !!post.quoteEnabled && (
            <span className="quote-badge">
              {post.selectedQuoteId
                ? "업체 선택됨"
                : post.quoteState === "expired"
                  ? "모집 종료"
                  : `견적 ${post.quoteCount || 0}/${post.quoteLimit}`}
            </span>
          )}
        </div>
      </article>
    );
  }
  function empty(
    title = "아직 이야기가 없어요",
    body = "첫 번째 이야기를 나눠보세요.",
  ) {
    return (
      <div className="empty">
        <MessageCircle size={32} />
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    );
  }
  function chooseRegion() {
    openForm(
      "커뮤니티 지역 선택",
      [{ key: "region", label: "지역", value: region }],
      async (values) => {
        const selected = values.region || "전체 지역";
        setRegion(selected);
        localStorage.setItem("matda-region", selected);
      },
      "적용하기",
      false,
    );
  }
  function filters() {
    return (
      <>
        <div className="feed-region-bar">
          <button onClick={chooseRegion} aria-label="커뮤니티 지역 선택">
            <MapPin size={18} />
            <span>
              {region === "전체 지역"
                ? "전체 지역"
                : region.split(" ").join(" · ")}
            </span>
            <ChevronRight size={16} />
          </button>
          <span>
            {region === "전체 지역"
              ? "보고 싶은 동네를 선택하세요"
              : "이 지역의 이야기를 보고 있어요"}
          </span>
          {region !== "전체 지역" && (
            <button
              className="region-reset"
              onClick={() => {
                setRegion("전체 지역");
                localStorage.setItem("matda-region", "전체 지역");
              }}
            >
              전체 지역 보기
            </button>
          )}
        </div>
        <div className="searchbar">
          <Search size={20} />
          <input
            aria-label="검색"
            placeholder={
              biz
                ? "기업에 필요한 서비스를 검색해보세요"
                : "어떤 도움이 필요하세요? 이웃의 이야기를 검색해보세요"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button aria-label="검색 지우기" onClick={() => setSearch("")}>
              <X size={18} />
            </button>
          )}
        </div>
        <div className="mobile-categories">
          {["전체", ...(biz ? businessCategories : categories)].map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="feed-tabs">
          {["전체", "해줘요", "질문", "후기", "자유"].map((t) => (
            <button
              key={t}
              className={type === t ? "active" : ""}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
          <span className="sort">
            <SlidersHorizontal size={14} /> 최신순
          </span>
        </div>
      </>
    );
  }
  function feed() {
    const popular =
      !biz && path !== "/quotes" ? popularPosts(rows, region) : [];
    return (
      <>
        <section className="welcome">
          <div className="eyebrow">
            {biz ? "WORK, BETTER TOGETHER" : "HELLO, NEIGHBOR"}
          </div>
          <h1>
            {biz ? "기업의 일도, 좋은 연결에서" : "가까운 이웃과, 더 나은 일상"}
          </h1>
          <p>
            {biz
              ? "우리 회사에 맞는 전문업체를 만나보세요."
              : "작은 질문부터 필요한 도움까지, 편하게 이야기해요."}
          </p>
          <span className="welcome-art">
            <MessageCircle size={60} />
            <Sparkles size={27} />
          </span>
        </section>
        {popular.length > 0 && (
          <section className="popular-posts" aria-label="우리 동네 인기글">
            <h2>
              우리 동네 인기글 <small>· 이번 주</small>
            </h2>
            <ol>
              {popular.map(({ post, count }, i) => (
                <li key={post.id}>
                  <Link href={"/posts/" + post.id}>
                    <b>{i + 1}</b>
                    <span>{str(post.title)}</span>
                    <small>댓글 {count}</small>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
        {biz && (
          <div className="biz-links">
            {[
              ["/biz/rfqs", "비교견적 RFQ"],
              ["/biz/contracts", "사업장·계약"],
              ["/biz/tenders", "민간입찰"],
            ].map(([href, label]) => (
              <Link key={href} href={href}>
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </div>
        )}
        {filters()}
        <div className="section-caption">
          <span>
            {biz ? "기업 요청" : "우리 동네 이야기"} <b>{posts.length}</b>
          </span>
          <span>함께 나누면 쉬워져요</span>
        </div>
        <div className="feed">{posts.length ? posts.map(card) : empty()}</div>
      </>
    );
  }
  function quoteForm(post: Row) {
    const template = own("template")[0];
    openForm(
      "우리 업체의 견적 보내기",
      [
        {
          key: "amount",
          label: "견적 금액 (원)",
          type: "number",
          required: true,
          value: str(template?.amount),
        },
        {
          key: "message",
          label: "한줄 설명",
          required: true,
          value: str(template?.message),
        },
        { key: "availableDate", label: "가능일 (선택)", type: "date" },
        { key: "scope", label: "포함범위 (선택)", value: str(template?.scope) },
        { key: "duration", label: "예상시간 (선택)" },
        { key: "extraCost", label: "추가비용 조건 (선택)" },
      ],
      async (v) => {
        await action("quote.submit", { ...v, postId: post.id });
      },
    );
  }
  function detail(post: Row) {
    const quotes = rows.filter(
      (r) => r.kind === "quote" && r.postId === post.id,
    );
    const isOwner = post.ownerId === user?.id;
    return (
      <>
        <Link
          className="back"
          href={post.audience === "business" ? "/biz" : "/community"}
        >
          ← 이야기 목록
        </Link>
        <section className="panel detail">
          {card(post)}
          <div className="body-text">{str(post.body)}</div>
          <p className="muted">희망 일정: {scheduleLabel(post)}</p>
          <div className="actions">
            {isOwner ? (
              <>
                <button onClick={() => createPost(post)}>수정</button>
                <button
                  className="danger"
                  onClick={() =>
                    openForm(
                      "글 삭제",
                      [
                        {
                          key: "confirm",
                          label: "삭제하려면 삭제를 입력하세요",
                          required: true,
                        },
                      ],
                      async (v) => {
                        if (v.confirm !== "삭제")
                          throw new Error("삭제를 입력해주세요.");
                        await action("post.delete", { id: post.id });
                        router.push("/community");
                      },
                    )
                  }
                >
                  삭제
                </button>
              </>
            ) : (
              <button className="primary" onClick={() => chat(post)}>
                <MessageCircle size={16} />
                채팅하기
              </button>
            )}
            <button
              onClick={() =>
                openForm(
                  "신고하기",
                  [
                    {
                      key: "reason",
                      label: "신고 사유",
                      type: "textarea",
                      required: true,
                    },
                  ],
                  async (v) => {
                    await action("report.create", { ...v, targetId: post.id });
                  },
                )
              }
            >
              신고
            </button>
            {!isOwner && (
              <button
                onClick={() =>
                  run(
                    () => action("block.create", { targetId: post.ownerId }),
                    "차단했어요.",
                  )
                }
              >
                작성자 차단
              </button>
            )}
          </div>
        </section>
        {flags.quotes && !!post.quoteEnabled && (
          <section className="panel">
            <h2>
              도착한 견적 <span className="count">{quotes.length}</span>
            </h2>
            <p className="muted">
              모집 마감 {new Date(str(post.expiresAt)).toLocaleString("ko-KR")}{" "}
              · 최대 {str(post.quoteLimit)}개
            </p>
            {isOwner && (
              <div className="actions">
                <button
                  onClick={() =>
                    run(() => action("quote.expand", { id: post.id }))
                  }
                >
                  추가 5개 받기
                </button>
                <button
                  onClick={() =>
                    run(() => action("quote.extend", { id: post.id }))
                  }
                >
                  24시간 연장
                </button>
              </div>
            )}
            {user?.role === "provider" && !isOwner && (
              <button className="primary" onClick={() => quoteForm(post)}>
                견적 보내기 / 수정
              </button>
            )}
            <div className="quote-grid">
              {quotes.map((q) => (
                <div className="quote-card" key={q.id}>
                  <h3>{str(q.providerName)}</h3>
                  <strong className="price">{currency(q.amount)}</strong>
                  <label className="compare-check">
                    <input
                      type="checkbox"
                      checked={compared.includes(q.id)}
                      onChange={(e) =>
                        setCompared((prev) =>
                          e.target.checked
                            ? [...prev, q.id].slice(-3)
                            : prev.filter((id) => id !== q.id),
                        )
                      }
                    />
                    비교에 담기 (최대 3개)
                  </label>
                  <p>{str(q.message)}</p>
                  <dl>
                    <dt>가능일</dt>
                    <dd>{str(q.availableDate) || "협의"}</dd>
                    <dt>포함범위</dt>
                    <dd>{str(q.scope) || "협의"}</dd>
                    <dt>예상시간</dt>
                    <dd>{str(q.duration) || "협의"}</dd>
                    <dt>추가비용</dt>
                    <dd>{str(q.extraCost) || "별도 문의"}</dd>
                  </dl>
                  {privateFiles(q)}
                  {isOwner && !post.selectedQuoteId && (
                    <button
                      onClick={() =>
                        run(
                          () => action("quote.select", { id: q.id }),
                          "업체를 선택했어요. 실제 거래완료는 별도로 확인해주세요.",
                        )
                      }
                    >
                      이 업체 선택
                    </button>
                  )}
                  {post.selectedQuoteId === q.id && (
                    <span className="success">
                      <Check size={16} />
                      선택한 업체
                    </span>
                  )}
                </div>
              ))}
            </div>
            {compared.length > 1 && (
              <div className="comparison-table">
                <table>
                  <caption>선택한 견적 비교</caption>
                  <thead>
                    <tr>
                      <th>업체</th>
                      <th>가격</th>
                      <th>가능일</th>
                      <th>범위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes
                      .filter((q) => compared.includes(q.id))
                      .map((q) => (
                        <tr key={q.id}>
                          <th>{str(q.providerName)}</th>
                          <td>{currency(q.amount)}</td>
                          <td>{str(q.availableDate) || "협의"}</td>
                          <td>{str(q.scope) || "협의"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            {!quotes.length &&
              empty(
                "아직 확인할 견적이 없어요",
                "견적은 요청자와 작성 업체만 확인할 수 있어요.",
              )}
            {!!post.selectedQuoteId && (
              <div className="notice">
                <h3>실제로 거래하셨나요?</h3>
                {post.selectedProviderId === user?.id &&
                  !post.providerAccepted && (
                    <button
                      onClick={() =>
                        run(() => action("selection.accept", { id: post.id }))
                      }
                    >
                      업체 선택 수락
                    </button>
                  )}
                <p>
                  고객 확인: {post.customerConfirmed ? "완료" : "미확인"} · 업체
                  확인: {post.providerConfirmed ? "완료" : "미확인"}
                </p>
                <div className="actions">
                  <button
                    onClick={() =>
                      run(() =>
                        action("trade.confirm", {
                          id: post.id,
                          confirmed: true,
                        }),
                      )
                    }
                  >
                    거래 / 작업 완료 확인
                  </button>
                  <button
                    onClick={() =>
                      run(() =>
                        action("trade.confirm", {
                          id: post.id,
                          confirmed: false,
                        }),
                      )
                    }
                  >
                    아직 거래 전이에요
                  </button>
                  {isOwner && (
                    <button
                      onClick={() =>
                        openForm(
                          "거래 후기",
                          [
                            {
                              key: "rating",
                              label: "평점",
                              options: ["5", "4", "3", "2", "1"],
                            },
                            {
                              key: "body",
                              label: "후기",
                              type: "textarea",
                              required: true,
                            },
                          ],
                          async (v) => {
                            await action("review.create", {
                              ...v,
                              id: post.id,
                            });
                          },
                        )
                      }
                    >
                      후기 작성
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
        <section className="panel">
          <h2>댓글</h2>
          {rows
            .filter((r) => r.kind === "comment" && r.postId === post.id)
            .map((c) => (
              <div className="comment" key={c.id}>
                <b>{str(c.authorName)}</b>
                <p>{str(c.body)}</p>
                <button
                  className="text-button"
                  onClick={() =>
                    c.ownerId === user?.id
                      ? run(() => action("comment.delete", { id: c.id }))
                      : openForm(
                          "댓글 신고",
                          [
                            {
                              key: "reason",
                              label: "신고 사유",
                              required: true,
                            },
                          ],
                          async (v) => {
                            await action("report.create", {
                              ...v,
                              targetId: c.id,
                            });
                          },
                        )
                  }
                >
                  {c.ownerId === user?.id ? "삭제" : "신고"}
                </button>
              </div>
            ))}
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              run(async () => {
                await action("comment.create", {
                  postId: post.id,
                  body: new FormData(form).get("body"),
                });
                form.reset();
              }, "댓글을 남겼어요.");
            }}
          >
            <input
              name="body"
              aria-label="댓글 내용"
              placeholder="따뜻한 댓글을 남겨주세요"
              required
              maxLength={2000}
            />
            <button className="primary" aria-label="등록" disabled={busy}>
              <Send size={18} />
              <span>등록</span>
            </button>
          </form>
        </section>
      </>
    );
  }
  function providers() {
    const items = rows.filter(
      (r) =>
        r.kind === "provider" &&
        [r.name, r.intro, r.region, r.category].join(" ").includes(search) &&
        (category === "전체" || r.category === category),
    );
    const selected = path.split("/")[2]
      ? items.find((r) => r.id === path.split("/")[2])
      : undefined;
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">GOOD PEOPLE, GOOD WORK</div>
            <h1>믿고 맡길 좋은 업체</h1>
            <p>서비스와 활동지역을 확인하고 대화를 시작해보세요.</p>
          </div>
        </div>
        <div className="feed-region-bar">
          <button onClick={chooseRegion} aria-label="커뮤니티 지역 선택">
            <MapPin size={18} />
            <span>
              {region === "전체 지역"
                ? "전체 지역"
                : region.split(" ").join(" · ")}
            </span>
            <ChevronRight size={16} />
          </button>
          <span>
            {region === "전체 지역"
              ? "보고 싶은 동네를 선택하세요"
              : "이 지역의 이야기를 보고 있어요"}
          </span>
          {region !== "전체 지역" && (
            <button
              className="region-reset"
              onClick={() => {
                setRegion("전체 지역");
                localStorage.setItem("matda-region", "전체 지역");
              }}
            >
              전체 지역 보기
            </button>
          )}
        </div>
        <div className="searchbar">
          <Search size={20} />
          <input
            aria-label="업체 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="업체명, 서비스, 지역 검색"
          />
        </div>
        {selected ? (
          <section className="panel">
            <h2>{str(selected.name)}</h2>
            <p>{str(selected.intro)}</p>
            <p>
              {str(selected.category)} · {str(selected.region)}
            </p>
            <span className="badge">
              {selected.verification === "verified"
                ? "사업자 확인"
                : "사업자 미확인"}
            </span>
            <h3>고객 후기</h3>
            {rows
              .filter(
                (r) => r.kind === "review" && r.providerId === selected.ownerId,
              )
              .map((r) => (
                <div className="comment" key={r.id}>
                  <b>
                    {"★".repeat(Number(r.rating))} · {str(r.authorName)}
                  </b>
                  <p>{str(r.body)}</p>
                </div>
              ))}
            <h3>포트폴리오</h3>
            <div className="photo-strip">
              {rows
                .filter((r) => r.kind === "media" && r.targetId === selected.id)
                .map((r) => (
                  <img
                    key={r.id}
                    src={"/api/media?id=" + r.id}
                    alt={str(r.name)}
                  />
                ))}
            </div>
            {selected.ownerId === user?.id && (
              <label className="upload-button">
                <ImagePlus size={17} />
                포트폴리오 사진 추가
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      run(
                        () => upload(file, selected.id),
                        "사진을 추가했어요.",
                      );
                  }}
                />
              </label>
            )}
            <p className="body-text">
              {str(selected.portfolio) || "등록된 포트폴리오가 없어요."}
            </p>
            <p>연락처: {str(selected.contact) || "업체 선택 후 공개됩니다."}</p>
            <button className="primary" onClick={() => chat(selected)}>
              채팅으로 문의
            </button>
            <button onClick={() => createPost(undefined, selected.id)}>
              견적 요청하기
            </button>
          </section>
        ) : (
          <div className="provider-grid">
            {items.length
              ? items.map((p) => (
                  <article className="panel provider-card" key={p.id}>
                    <div className="provider-avatar">
                      <Wrench size={30} />
                    </div>
                    <div>
                      <Link href={"/providers/" + p.id}>
                        <h3>{str(p.name)}</h3>
                      </Link>
                      <span className="muted">
                        후기{" "}
                        {
                          rows.filter(
                            (r) =>
                              r.kind === "review" && r.providerId === p.ownerId,
                          ).length
                        }
                        개
                      </span>
                      <p>{str(p.intro)}</p>
                      <span className="muted">
                        {str(p.region)} · {str(p.category)}
                      </span>
                      <p className="verification">
                        {p.verification === "verified" ? (
                          <>
                            <ShieldCheck size={15} />
                            사업자 확인
                          </>
                        ) : (
                          "사업자 미확인"
                        )}
                      </p>
                    </div>
                    <button onClick={() => chat(p)}>채팅</button>
                  </article>
                ))
              : empty(
                  "첫 업체를 기다리고 있어요",
                  "업체 계정으로 가입하고 MY에서 프로필을 등록해보세요.",
                )}
          </div>
        )}
      </>
    );
  }
  function my() {
    if (!user)
      return (
        <section className="panel empty">
          <UserRound size={36} />
          <h1>나의 연결을 한곳에서</h1>
          <p>로그인하고 글과 대화를 이어가세요.</p>
          <button className="primary" onClick={() => setAuthOpen(true)}>
            로그인 / 회원가입
          </button>
        </section>
      );
    return (
      <>
        <section className="panel account">
          <span className="big-avatar">{user.name[0]}</span>
          <div>
            <h1>{user.name}님</h1>
            <p>
              {user.role === "provider" ? "업체 회원" : "일반 회원"} ·{" "}
              {user.region || "지역 미설정"}
            </p>
            <button
              className="text-button"
              onClick={() =>
                openForm(
                  "내 기본 지역",
                  [
                    {
                      key: "region",
                      label: "지역",
                      required: true,
                      value: user.region,
                    },
                  ],
                  async (v) => {
                    await action("profile.region", v);
                  },
                )
              }
            >
              기본 지역 설정
            </button>
          </div>
          <button
            onClick={() =>
              run(async () => {
                await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
                await refresh();
              }, "로그아웃했어요.")
            }
          >
            <LogOut size={17} />
            로그아웃
          </button>
        </section>
        <div className="stats">
          <div>
            <b>{own("post").length}</b>
            <span>내가 쓴 글</span>
          </div>
          {flags.quotes && (
            <div>
              <b>{own("quote").length}</b>
              <span>보낸 견적</span>
            </div>
          )}
          <div>
            <b>{rows.filter((r) => r.kind === "conversation").length}</b>
            <span>나의 대화</span>
          </div>
        </div>
        {flags.quotes && user.role === "provider" && (
          <section className="panel">
            <h2>업체 관리</h2>
            {flags.providers && own("provider")[0] && (
              <Link
                className="text-button"
                href={"/providers/" + own("provider")[0].id}
              >
                내 프로필 · 포트폴리오 사진 관리 →
              </Link>
            )}
            <p className="muted">
              보낸 견적 {own("quote").length} · 고객 열람{" "}
              {own("quote").filter((q) => q.viewedAt).length} · 선택된 요청{" "}
              {
                rows.filter(
                  (r) => r.kind === "post" && r.selectedProviderId === user.id,
                ).length
              }{" "}
              · 받은 후기{" "}
              {
                rows.filter(
                  (r) => r.kind === "review" && r.providerId === user.id,
                ).length
              }
            </p>
            <div className="actions">
              <button
                className="primary"
                onClick={() => {
                  const p = own("provider")[0];
                  openForm(
                    "업체 프로필 관리",
                    [
                      {
                        key: "name",
                        label: "업체명",
                        required: true,
                        value: str(p?.name || user.name),
                      },
                      {
                        key: "intro",
                        label: "소개",
                        type: "textarea",
                        required: true,
                        value: str(p?.intro),
                      },
                      {
                        key: "region",
                        label: "활동지역",
                        required: true,
                        value: str(p?.region || user.region),
                      },
                      {
                        key: "category",
                        label: "서비스",
                        options: [...categories, ...businessCategories],
                        value: str(p?.category),
                      },
                      {
                        key: "contact",
                        label: "연락처 (선택한 고객에게만 공개)",
                        required: true,
                        value: str(p?.contact),
                      },
                      {
                        key: "portfolio",
                        label: "포트폴리오 설명",
                        type: "textarea",
                        value: str(p?.portfolio),
                      },
                    ],
                    async (v) => {
                      await action("provider.save", v);
                    },
                  );
                }}
              >
                프로필 · 포트폴리오
              </button>
              <button
                onClick={() =>
                  openForm(
                    "사업자 확인 요청",
                    [
                      {
                        key: "note",
                        label: "사업자·자격 확인 요청 내용",
                        type: "textarea",
                        required: true,
                      },
                    ],
                    async (v) => {
                      await action("verification.request", v);
                    },
                  )
                }
              >
                사업자 확인 요청
              </button>
              <button
                onClick={() =>
                  openForm(
                    "견적 템플릿 저장",
                    [
                      { key: "name", label: "템플릿명", required: true },
                      {
                        key: "amount",
                        label: "기본 금액",
                        type: "number",
                        required: true,
                      },
                      { key: "message", label: "기본 설명", required: true },
                      { key: "scope", label: "포함범위" },
                    ],
                    async (v) => {
                      await action("template.save", v);
                    },
                  )
                }
              >
                견적 템플릿 추가
              </button>
            </div>
            {own("template").map((t) => (
              <div className="list-row" key={t.id}>
                <b>{str(t.name)}</b>
                <span>{currency(t.amount)}</span>
                <p>{str(t.message)}</p>
              </div>
            ))}
            {own("verification").map((v) => (
              <div key={v.id}>
                <h3>사업자 확인 · {str(v.status)}</h3>
                {privateFiles(v)}
              </div>
            ))}
            <p className="muted">
              정산예정금: 결제 기능을 활성화한 뒤 제공됩니다.
            </p>
          </section>
        )}
        {(flags.biz || flags.quotes) && (
          <section className="panel">
            <h2>{flags.biz ? "내 기업" : "업체 기능"}</h2>
            {user.role === "customer" && (
              <button
                onClick={() =>
                  run(
                    () => action("profile.enableProvider"),
                    "업체 기능을 활성화했어요.",
                  )
                }
              >
                업체 기능도 사용하기
              </button>
            )}
            {flags.biz &&
              rows
                .filter((r) => r.kind === "organization")
                .map((o) => (
                  <div className="list-row" key={o.id}>
                    <Building2 size={20} />
                    <b>{str(o.name)}</b>
                    <span>
                      {o.ownerId === user.id ? "대표 담당자" : "기업 구성원"} ·{" "}
                      {str(o.verification)}
                    </span>
                    {o.ownerId === user.id && (
                      <button
                        onClick={() =>
                          openForm(
                            "기업 확인 요청",
                            [
                              {
                                key: "note",
                                label: "사업자 확인 내용",
                                type: "textarea",
                                required: true,
                              },
                            ],
                            async (v) => {
                              await action("organization.verifyRequest", {
                                ...v,
                                id: o.id,
                              });
                            },
                          )
                        }
                      >
                        기업 확인 요청
                      </button>
                    )}
                    {o.ownerId === user.id && (
                      <button
                        onClick={() =>
                          openForm(
                            "구성원 추가",
                            [
                              {
                                key: "email",
                                label: "기존 회원 이메일",
                                type: "email",
                                required: true,
                              },
                              {
                                key: "role",
                                label: "기업 역할",
                                options: ["member", "procurement", "admin"],
                              },
                            ],
                            async (v) => {
                              await action("organization.addMember", {
                                ...v,
                                id: o.id,
                              });
                            },
                          )
                        }
                      >
                        구성원 관리
                      </button>
                    )}
                  </div>
                ))}
            {flags.biz && (
              <button
                onClick={() =>
                  openForm(
                    "기업 등록",
                    [{ key: "name", label: "기업명", required: true }],
                    async (v) => {
                      await action("organization.create", v);
                    },
                  )
                }
              >
                기업 등록
              </button>
            )}
          </section>
        )}
        <h2>내가 쓴 글</h2>
        <div className="feed">
          {own("post").filter((p) => p.status === "published").length
            ? own("post")
                .filter((p) => p.status === "published")
                .map(card)
            : empty()}
        </div>
      </>
    );
  }
  function chats() {
    if (!user) return my();
    const selected = rows.find(
      (r) => r.kind === "conversation" && r.id === path.split("/")[2],
    );
    const conversations = rows.filter((r) => r.kind === "conversation");
    return (
      <>
        <h1>나의 대화</h1>
        <p className="muted">연락처를 공개하지 않고 편하게 이야기하세요.</p>
        <div className="chat-layout">
          <section className="panel chat-list">
            {conversations.length
              ? conversations.map((c) => {
                  const unread = rows.filter(
                    (r) =>
                      r.kind === "message" &&
                      r.conversationId === c.id &&
                      !(r.readBy as string[]).includes(user.id),
                  ).length;
                  return (
                    <Link
                      key={c.id}
                      className={
                        "chat-item " + (c.id === selected?.id ? "selected" : "")
                      }
                      href={"/chat/" + c.id}
                      onClick={() =>
                        run(() => action("conversation.read", { id: c.id }), "")
                      }
                    >
                      <MessageCircle size={21} />
                      <span>{str(c.title)}</span>
                      {unread > 0 && <b className="unread">{unread}</b>}
                    </Link>
                  );
                })
              : empty("아직 대화가 없어요", "글에서 채팅을 시작하세요.")}
          </section>
          {selected && (
            <section className="panel chat-main">
              <h2>{str(selected.title)}</h2>
              <div className="messages">
                {rows
                  .filter(
                    (r) =>
                      r.kind === "message" && r.conversationId === selected.id,
                  )
                  .map((m) => (
                    <div
                      key={m.id}
                      className={
                        "message " + (m.ownerId === user.id ? "mine" : "")
                      }
                    >
                      <small>{str(m.authorName)}</small>
                      <p>{str(m.body)}</p>
                      <small>
                        {new Date(m.createdAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </div>
                  ))}
              </div>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  run(async () => {
                    await action("message.create", {
                      conversationId: selected.id,
                      body: new FormData(f).get("body"),
                    });
                    f.reset();
                  }, "");
                }}
              >
                <input
                  name="body"
                  aria-label="메시지"
                  placeholder="메시지를 입력하세요"
                  required
                  maxLength={4000}
                />
                <button className="primary" aria-label="보내기" disabled={busy}>
                  <Send size={18} />
                  <span>보내기</span>
                </button>
              </form>
            </section>
          )}
        </div>
      </>
    );
  }
  function organizationsRequired() {
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    if (!rows.filter((r) => r.kind === "organization").length) {
      setToast("MY에서 기업을 먼저 등록해주세요.");
      router.push("/my");
      return false;
    }
    return true;
  }
  function procurementForm(tender = false) {
    if (!organizationsRequired()) return;
    openForm(
      tender ? "민간 공개 제안입찰 작성" : "비교견적 RFQ 작성",
      [
        {
          key: "org",
          label: "발주기업",
          options: rows
            .filter((r) => r.kind === "organization")
            .map((o) => str(o.name)),
          required: true,
        },
        { key: "title", label: "공고명", required: true },
        { key: "body", label: "업무범위", type: "textarea", required: true },
        {
          key: "category",
          label: "카테고리",
          options: businessCategories,
          required: true,
        },
        { key: "region", label: "지역", required: true, value: user?.region },
        {
          key: "deadline",
          label: "마감일시",
          type: "datetime-local",
          required: true,
        },
        {
          key: "eligibility",
          label: "참가조건",
          type: "textarea",
          required: tender,
        },
        ...(tender
          ? [
              {
                key: "startAt",
                label: "시작일시",
                type: "datetime-local",
                required: true,
              },
              {
                key: "evaluation",
                label: "선정방식",
                type: "textarea",
                required: true,
              },
            ]
          : []),
      ],
      async (v) => {
        const row = await action(tender ? "tender.create" : "rfq.create", {
          ...v,
          orgId: rows
            .filter((r) => r.kind === "organization")
            .find((o) => o.name === v.org)?.id,
        });
        router.push(`/biz/${tender ? "tenders" : "rfqs"}/${row.id}`);
      },
    );
  }
  function privateFiles(target: Row) {
    const files = rows.filter(
      (r) => r.kind === "media" && r.targetId === target.id,
    );
    return (
      <div className="attachments">
        <h3>첨부 문서</h3>
        {files.map((f) => (
          <button
            key={f.id}
            onClick={() =>
              run(async () => {
                const response = await fetch("/api/media?id=" + f.id);
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                const a = document.createElement("a");
                a.href = result.url;
                a.download = str(f.name);
                a.click();
              }, "")
            }
          >
            <FileText size={15} />
            {str(f.name)}
            {f.bidVersion ? ` · v${f.bidVersion}` : ""}
          </button>
        ))}
        {target.ownerId === user?.id && (
          <label className="upload-button">
            <Plus size={16} />
            문서 첨부
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.zip,.jpg,.png,.webp,.dwg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  run(async () => {
                    const form = new FormData();
                    form.set("file", file);
                    form.set("visibility", "private");
                    form.set("targetId", target.id);
                    const response = await fetch("/api/media", {
                      method: "POST",
                      body: form,
                    });
                    const payload = await response.json();
                    if (!response.ok) throw new Error(payload.error);
                    await refresh();
                  }, "문서를 첨부했어요.");
              }}
            />
          </label>
        )}
        <p className="muted">
          참여 권한 확인 후 1분 동안 유효한 다운로드 링크가 발급됩니다.
        </p>
      </div>
    );
  }
  function procurement(tender = false) {
    const kind = tender ? "tender" : "rfq";
    const items = rows.filter((r) => r.kind === kind);
    const selected = items.find((r) => r.id === path.split("/")[3]);
    const owner =
      selected &&
      rows
        .filter((r) => r.kind === "organization")
        .some((o) => o.id === selected.orgId);
    const submissions = selected
      ? rows.filter(
          (r) =>
            r.kind === (tender ? "bid" : "proposal") &&
            r[tender ? "tenderId" : "rfqId"] === selected.id,
        )
      : [];
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">{siteConfig.businessName}</div>
            <h1>
              {tender ? "민간 공개 제안입찰" : "같은 조건으로, 더 나은 비교"}
            </h1>
            <p>
              {tender
                ? "정해진 마감과 절차에 따라 업체를 선정하세요."
                : "업무범위와 일정을 공유하고 비공개 제안을 받아보세요."}
            </p>
          </div>
          <button className="primary" onClick={() => procurementForm(tender)}>
            <Plus size={18} />
            {tender ? "공고 작성" : "RFQ 작성"}
          </button>
        </div>
        {tender && (
          <div className="notice">
            로컬 검증용 민간입찰입니다. 실서비스 공개는 외부 연결 및 입찰약관
            검토 후 활성화합니다.
          </div>
        )}
        {selected ? (
          <>
            <section className="panel">
              <span className="badge">{str(selected.status)}</span>
              <h2>{str(selected.title)}</h2>
              <p className="body-text">{str(selected.body)}</p>
              <p>
                <MapPin size={14} /> {str(selected.region)} ·{" "}
                {str(selected.category)}
              </p>
              <p>
                마감: {new Date(str(selected.deadline)).toLocaleString("ko-KR")}
              </p>
              <h3>참가조건</h3>
              <p>{str(selected.eligibility) || "별도 제한 없음"}</p>
              {tender && (
                <>
                  <h3>선정방식</h3>
                  <p>{str(selected.evaluation)}</p>
                </>
              )}
              {privateFiles(selected)}
              <div className="actions">
                {owner && tender && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() => action("tender.publish", { id: selected.id }))
                      }
                    >
                      공고 게시
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(() => action("tender.open", { id: selected.id }))
                      }
                    >
                      마감 후 개찰
                    </button>
                    <button
                      onClick={() =>
                        openForm(
                          "입찰 종료",
                          [
                            {
                              key: "status",
                              label: "종료 구분",
                              options: ["cancelled", "failed", "no_award"],
                            },
                            {
                              key: "note",
                              label: "사유",
                              type: "textarea",
                              required: true,
                            },
                          ],
                          async (v) => {
                            await action("tender.close", {
                              ...v,
                              id: selected.id,
                            });
                          },
                        )
                      }
                    >
                      취소 / 유찰
                    </button>
                  </>
                )}
                {user?.role === "provider" && !owner && (
                  <>
                    <button
                      className="primary"
                      onClick={() =>
                        openForm(
                          tender ? "투찰 제출 / 수정" : "제안 제출 / 수정",
                          [
                            {
                              key: "amount",
                              label: "금액 (원)",
                              type: "number",
                              required: true,
                            },
                            {
                              key: "body",
                              label: "제안 내용",
                              type: "textarea",
                              required: true,
                            },
                            ...(!tender
                              ? [
                                  {
                                    key: "duration",
                                    label: "수행기간",
                                    required: true,
                                  },
                                ]
                              : []),
                          ],
                          async (v) => {
                            await action(
                              tender ? "bid.submit" : "proposal.submit",
                              {
                                ...v,
                                [tender ? "tenderId" : "rfqId"]: selected.id,
                              },
                            );
                          },
                        )
                      }
                    >
                      {tender ? "투찰 제출 / 수정" : "견적 제안"}
                    </button>
                    {tender && (
                      <button
                        onClick={() =>
                          run(() =>
                            action("bid.withdraw", { tenderId: selected.id }),
                          )
                        }
                      >
                        투찰 철회
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>
            <section className="panel">
              <h2>{tender ? "투찰 내역" : "제안 비교"}</h2>
              {!submissions.length &&
                empty(
                  tender
                    ? "확인할 수 있는 투찰이 없어요"
                    : "아직 제안이 없어요",
                  tender
                    ? "발주기업은 마감 후 개찰해야 내용을 확인할 수 있습니다."
                    : "제안은 발주기업과 작성 업체만 볼 수 있습니다.",
                )}
              {submissions.map((s) => {
                const latest = tender
                  ? (s.versions as Record<string, unknown>[]).at(-1)!
                  : s;
                return (
                  <article className="quote-card" key={s.id}>
                    <h3>{str(s.providerName)}</h3>
                    <strong className="price">{currency(latest.amount)}</strong>
                    <p>{str(latest.body)}</p>
                    <p>
                      {tender
                        ? `버전 ${(s.versions as unknown[]).length} · ${s.status}`
                        : str(s.duration)}
                    </p>
                    {privateFiles(s)}
                    {owner &&
                      tender &&
                      selected.status === "opened" &&
                      s.status === "submitted" && (
                        <button
                          onClick={() =>
                            openForm(
                              "업체 선정",
                              [
                                {
                                  key: "note",
                                  label: "평가 및 선정 사유",
                                  type: "textarea",
                                  required: true,
                                },
                              ],
                              async (v) => {
                                await action("tender.award", {
                                  ...v,
                                  id: selected.id,
                                  bidId: s.id,
                                });
                              },
                            )
                          }
                        >
                          평가 후 선정
                        </button>
                      )}
                  </article>
                );
              })}
            </section>
            {tender && owner && (
              <section className="panel">
                <h2>감사로그</h2>
                {rows
                  .filter(
                    (r) => r.kind === "audit" && r.targetId === selected.id,
                  )
                  .map((r) => (
                    <p key={r.id}>
                      {new Date(r.createdAt).toLocaleString("ko-KR")} ·{" "}
                      {str(r.action)}
                    </p>
                  ))}
              </section>
            )}
          </>
        ) : (
          <div className="feed">
            {items.length
              ? items.map((r) => (
                  <Link
                    className="post-card"
                    key={r.id}
                    href={`/biz/${tender ? "tenders" : "rfqs"}/${r.id}`}
                  >
                    <span className="badge">{str(r.status)}</span>
                    <h3>{str(r.title)}</h3>
                    <p>{str(r.body)}</p>
                    <span className="muted">
                      {str(r.region)} · 마감 {date(r.deadline)}
                    </span>
                  </Link>
                ))
              : empty(
                  "등록된 공고가 없어요",
                  "기업을 등록하고 첫 요청을 작성해보세요.",
                )}
          </div>
        )}
      </>
    );
  }
  function contracts() {
    if (!user) return my();
    const work = rows.filter((r) => r.kind === "workplace");
    const contracts = rows.filter((r) => r.kind === "contract");
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">WORKPLACE & CONTRACT</div>
            <h1>사업장의 일, 놓치지 않도록</h1>
            <p>계약 만료와 점검일을 한곳에서 관리하세요.</p>
          </div>
        </div>
        <div className="actions">
          <button
            className="primary"
            onClick={() => {
              if (!organizationsRequired()) return;
              openForm(
                "사업장 등록",
                [
                  {
                    key: "org",
                    label: "기업",
                    options: rows
                      .filter((r) => r.kind === "organization")
                      .map((o) => str(o.name)),
                  },
                  { key: "name", label: "사업장명", required: true },
                  { key: "region", label: "주소 / 지역", required: true },
                ],
                async (v) => {
                  await action("workplace.create", {
                    ...v,
                    orgId: rows
                      .filter((r) => r.kind === "organization")
                      .find((o) => o.name === v.org)?.id,
                  });
                },
              );
            }}
          >
            사업장 등록
          </button>
          <button
            onClick={() => {
              if (!work.length) {
                setToast("사업장을 먼저 등록해주세요.");
                return;
              }
              openForm(
                "계약 등록",
                [
                  {
                    key: "workplace",
                    label: "사업장",
                    options: work.map((w) => str(w.name)),
                  },
                  { key: "name", label: "계약명", required: true },
                  { key: "providerName", label: "담당 업체", required: true },
                  {
                    key: "startAt",
                    label: "계약 시작일",
                    type: "date",
                    required: true,
                  },
                  {
                    key: "endAt",
                    label: "계약 종료일",
                    type: "date",
                    required: true,
                  },
                  { key: "inspectionAt", label: "다음 점검일", type: "date" },
                ],
                async (v) => {
                  const w = work.find((w) => w.name === v.workplace)!;
                  await action("contract.create", {
                    ...v,
                    orgId: w.orgId,
                    workplaceId: w.id,
                  });
                },
              );
            }}
          >
            계약 등록
          </button>
        </div>
        <div className="provider-grid">
          {work.map((w) => (
            <section className="panel" key={w.id}>
              <Building2 size={28} />
              <h2>{str(w.name)}</h2>
              <p>{str(w.region)}</p>
            </section>
          ))}
        </div>
        {contracts.length
          ? contracts.map((c) => {
              const days = Math.ceil(
                (Date.parse(str(c.endAt)) - Date.now()) / 86400000,
              );
              return (
                <section className="panel" key={c.id}>
                  <div className="post-top">
                    <h2>{str(c.name)}</h2>
                    <span
                      className={
                        "badge " + (days < 30 ? "request" : "question")
                      }
                    >
                      {days < 0 ? `만료 ${Math.abs(days)}일` : `D-${days}`}
                    </span>
                  </div>
                  <p>
                    {str(c.providerName)} · {date(c.startAt)} ~ {date(c.endAt)}
                  </p>
                  {!!c.inspectionAt && <p>다음 점검 {date(c.inspectionAt)}</p>}
                  {privateFiles(c)}
                  <div className="actions">
                    <button onClick={() => procurementForm(false)}>
                      재견적 요청
                    </button>
                    <button
                      onClick={() =>
                        openForm(
                          "계약 갱신",
                          [
                            {
                              key: "endAt",
                              label: "새 종료일",
                              type: "date",
                              required: true,
                            },
                          ],
                          async (v) => {
                            await action("contract.renew", { ...v, id: c.id });
                          },
                        )
                      }
                    >
                      재계약 / 갱신
                    </button>
                  </div>
                </section>
              );
            })
          : empty(
              "계약을 등록하고 일정을 관리하세요",
              "만료까지 남은 일수와 다음 점검일을 확인할 수 있어요.",
            )}
      </>
    );
  }
  function notifications() {
    return (
      <>
        <h1>알림</h1>
        {own("notification").length
          ? own("notification")
              .slice()
              .reverse()
              .map((n) => (
                <button
                  className="notification panel"
                  key={n.id}
                  onClick={() =>
                    run(() => action("notification.read", { id: n.id }), "")
                  }
                >
                  <Bell size={20} />
                  <span>{str(n.message)}</span>
                  <small>{n.read ? "읽음" : "새 알림"}</small>
                </button>
              ))
          : empty("새 알림이 없어요", "댓글과 채팅 소식을 여기서 알려드려요.")}
      </>
    );
  }
  function admin() {
    if (user?.role !== "admin")
      return empty("접근 권한이 없습니다", "관리자 계정으로 로그인해주세요.");
    return (
      <>
        <h1>운영 관리</h1>
        <section className="panel">
          <h2>회원 관리</h2>
          <input
            aria-label="회원 검색"
            placeholder="이름 또는 이메일"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {data.accounts
            ?.filter((a) => (a.name + a.email).includes(search))
            .map((a) => (
              <div className="list-row" key={a.id}>
                <b>{a.name}</b>
                <span>
                  {a.email} · {a.role}
                </span>
                <button
                  onClick={() =>
                    run(() =>
                      action("admin.account", {
                        id: a.id,
                        disabled: !a.disabled,
                      }),
                    )
                  }
                >
                  {a.disabled ? "이용 제한 해제" : "이용 제한"}
                </button>
              </div>
            ))}
        </section>
        <section className="panel">
          <h2>핵심 활동</h2>
          <div className="stats">
            {[
              ["post_created", "등록 글"],
              ["quote_received", "견적 제출"],
              ["provider_selected", "업체 선택"],
              ["trade_confirmed", "거래 확인"],
            ].map(([event, label]) => (
              <div key={event}>
                <b>
                  {
                    rows.filter((r) => r.kind === "event" && r.event === event)
                      .length
                  }
                </b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
        {rows
          .filter((r) => ["report", "verification"].includes(r.kind))
          .map((r) => (
            <section className="panel" data-entity-id={r.id} key={r.id}>
              <h3>
                {r.kind === "report" ? "신고" : "업체 확인 요청"} ·{" "}
                {str(r.status)}
              </h3>
              <p>{str(r.reason || r.note)}</p>
              {r.kind === "verification" && privateFiles(r)}
              {r.kind === "report" ? (
                <>
                  <button
                    onClick={() =>
                      run(() =>
                        action("admin.moderate", {
                          id: r.targetId,
                          status: "hidden",
                        }),
                      )
                    }
                  >
                    글 숨김
                  </button>
                  <button
                    onClick={() =>
                      run(() => action("admin.moderate", { id: r.id }))
                    }
                  >
                    신고 처리완료
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      run(() =>
                        action("admin.moderate", {
                          id: r.id,
                          status: "verified",
                        }),
                      )
                    }
                  >
                    사업자 확인
                  </button>
                  <button
                    onClick={() =>
                      run(() =>
                        action("admin.moderate", {
                          id: r.id,
                          status: "rejected",
                        }),
                      )
                    }
                  >
                    반려
                  </button>
                </>
              )}
            </section>
          ))}
      </>
    );
  }
  const content = selectedPost
    ? detail(selectedPost)
    : path.startsWith("/posts/")
      ? empty("글을 찾을 수 없어요", "삭제되었거나 접근 권한이 없는 글입니다.")
      : path.startsWith("/providers")
        ? providers()
        : path.startsWith("/my")
          ? my()
          : path.startsWith("/chat")
            ? chats()
            : path.startsWith("/notifications")
              ? notifications()
              : path.startsWith("/biz/rfqs")
                ? procurement()
                : path.startsWith("/biz/tenders")
                  ? procurement(true)
                  : path.startsWith("/biz/contracts")
                    ? contracts()
                    : path.startsWith("/admin")
                      ? admin()
                      : feed();
  const isFeed = ["/", "/community", "/quotes", "/biz"].includes(path);
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <header className="header">
        <div className="header-inner">
          <Link
            href={biz ? "/biz" : "/"}
            className={"brand " + (biz ? "biz-brand" : "")}
          >
            {biz ? (
              <>
                {siteConfig.parent}
                <em>BIZ</em>
              </>
            ) : (
              <>
                {siteConfig.name}
                <span className="sun">✳</span>
              </>
            )}
            <small>
              {biz ? "기업의 더 나은 연결" : "좋은 이웃, 좋은 연결"}
            </small>
          </Link>
          <nav className="desktop-nav" aria-label="주 메뉴">
            {nav.map((n) => (
              <Link
                key={n.href}
                className={
                  path === n.href || (n.href === "/biz" && biz) ? "active" : ""
                }
                href={n.href}
              >
                {n.label}
                {n.badge && <small>{n.badge}</small>}
              </Link>
            ))}
          </nav>
          <div className="header-tools">
            <button
              className="region-picker"
              aria-label="지역 선택"
              onClick={() => chooseRegion()}
            >
              <MapPin size={16} />
              <span>{region}</span>
              <ChevronRight size={14} />
            </button>
            <Link
              className="icon-button notifications-link"
              aria-label="알림"
              href="/notifications"
            >
              <Bell size={21} />
              {own("notification").some((n) => !n.read) && <i />}
            </Link>
            {user ? (
              <Link className="user-chip" href="/my">
                {user.name.slice(0, 2)}
              </Link>
            ) : (
              <button
                className="login-button"
                onClick={() => {
                  setSignup(false);
                  setAuthOpen(true);
                }}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>
      <nav className="mobile-top-nav" aria-label="서비스 메뉴">
        {nav.slice(1).map((n) => (
          <Link
            key={n.href}
            className={path === n.href ? "active" : ""}
            href={n.href}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      <button className="tablet-write primary" onClick={() => createPost()}>
        <Plus size={18} />
        글쓰기
      </button>
      <div className="preview-strip">
        로컬 미리보기 <span>·</span> 예시 글과 직접 등록한 데이터로 이용 흐름을
        확인할 수 있어요.
      </div>
      <div className={"layout " + (!isFeed ? "wide-content" : "")}>
        <aside className="sidebar">
          <div className="sidebar-label">
            {biz ? "기업서비스" : "우리 동네"}
          </div>
          <Link
            className={"side-item " + (isFeed ? "active" : "")}
            href={biz ? "/biz" : "/community"}
          >
            <House size={19} />
            {biz ? "기업 요청" : "전체 이야기"}
          </Link>
          {["해줘요", "질문", "후기", "자유"].map((t, i) => {
            const Icon = [BriefcaseBusiness, MessageCircle, Heart, FileText][i];
            return (
              <button
                key={t}
                className={"side-item " + (type === t ? "active" : "")}
                onClick={() => {
                  setType(t);
                  if (!isFeed) router.push("/community");
                }}
              >
                <Icon size={19} />
                {t}
              </button>
            );
          })}
          <div className="sidebar-divider" />
          <div className="sidebar-label">
            {biz ? "기업 서비스 카테고리" : "어떤 도움이 필요하세요?"}
          </div>
          {(biz ? businessCategories : categories).map((c, i) => {
            const Icon = (biz ? bizIcons : icons)[i % 6];
            return (
              <button
                className={
                  "side-item category-item " + (category === c ? "active" : "")
                }
                key={c}
                onClick={() => {
                  setCategory(category === c ? "전체" : c);
                  if (!isFeed) router.push(biz ? "/biz" : "/community");
                }}
              >
                <Icon size={18} />
                {c}
              </button>
            );
          })}
          {flags.biz && (
            <Link className="business-link" href={biz ? "/" : "/biz"}>
              <Building2 size={20} />
              <span>
                {biz ? "이웃 커뮤니티" : "기업에 필요한 일도"}
                <b>
                  {biz ? siteConfig.name : siteConfig.businessName}{" "}
                  <ArrowUpRight size={13} />
                </b>
              </span>
            </Link>
          )}
          <div className="sidebar-footer">
            <span>이용안내 · 개인정보</span>
            <span>© {siteConfig.parent} · Preview</span>
          </div>
        </aside>
        <main id="main">
          {error ? (
            <section className="panel empty" role="alert">
              <h2>불러오지 못했어요</h2>
              <p>{error}</p>
              <button onClick={refresh}>다시 시도</button>
            </section>
          ) : loading ? (
            <div className="skeleton" aria-label="불러오는 중" aria-busy="true">
              {[1, 2, 3].map((n) => (
                <div key={n} />
              ))}
            </div>
          ) : (
            content
          )}
        </main>
        {isFeed && (
          <aside className="right-rail">
            <section className="write-panel">
              <div className="small-icon">
                <Plus size={22} />
              </div>
              <h2>
                혼자 고민하지 말고
                <br />
                이웃에게 물어보세요
              </h2>
              <p>
                필요한 도움, 궁금한 일.
                <br />글 하나면 충분해요.
              </p>
              <button className="primary full" onClick={() => createPost()}>
                <Plus size={17} />
                글쓰기
              </button>
              <small>
                {flags.quotes
                  ? "글쓰기 · 견적 · 채팅, 모두 무료"
                  : "글쓰기 · 댓글 · 채팅, 모두 무료"}
              </small>
            </section>
            <section className="panel activity">
              <div className="panel-title">
                <h3>나의 활동</h3>
                <Link href="/my">
                  <ChevronRight size={16} />
                </Link>
              </div>
              {user ? (
                <>
                  <Link href="/my">
                    내가 쓴 글 <b>{own("post").length}</b>
                  </Link>
                  <Link href="/chat">
                    진행 중인 대화{" "}
                    <b>
                      {rows.filter((r) => r.kind === "conversation").length}
                    </b>
                  </Link>
                  <Link href="/notifications">
                    새 알림{" "}
                    <b>{own("notification").filter((n) => !n.read).length}</b>
                  </Link>
                </>
              ) : (
                <>
                  <p>
                    로그인하고 나의 이야기를
                    <br />
                    이어서 확인해보세요.
                  </p>
                  <button onClick={() => setAuthOpen(true)}>
                    로그인하기 <ArrowRight size={15} />
                  </button>
                </>
              )}
            </section>
            <section className="guide-panel">
              <span className="eyebrow">함께 만드는 좋은 연결</span>
              <h3>처음 오셨나요?</h3>
              <ol>
                <li>
                  <b>1</b>편하게 글을 남겨요
                </li>
                <li>
                  <b>2</b>댓글과 채팅으로 이야기해요
                </li>
                <li>
                  <b>3</b>나에게 맞는 도움을 만나요
                </li>
              </ol>
              {flags.providers && (
                <Link href="/providers">
                  좋은 업체 만나보기 <ArrowUpRight size={15} />
                </Link>
              )}
            </section>
            <div className="trust-note">
              <ShieldCheck size={21} />
              <p>
                서로 존중하는 한마디가
                <br />
                안심할 수 있는 동네를 만들어요.
              </p>
            </div>
          </aside>
        )}
      </div>
      <nav className="bottom-nav" aria-label="모바일 메뉴">
        <Link href="/" className={path === "/" ? "active" : ""}>
          <House size={22} />
          <span>홈</span>
        </Link>
        <button onClick={() => createPost()}>
          <span className="write-circle">
            <Plus size={21} />
          </span>
          <span>글쓰기·요청</span>
        </button>
        <Link href="/chat" className={path.startsWith("/chat") ? "active" : ""}>
          <MessageCircle size={22} />
          <span>채팅</span>
        </Link>
        <Link href="/my" className={path === "/my" ? "active" : ""}>
          <UserRound size={22} />
          <span>MY</span>
        </Link>
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="알림 닫기" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <dialog
        ref={dialogRef}
        onCancel={() => {
          setModal(null);
          setAuthOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setModal(null);
            setAuthOpen(false);
          }
        }}
      >
        <div className="dialog-header">
          <h2>
            {authOpen
              ? signup
                ? "반가워요, 이웃님"
                : "다시 만나 반가워요"
              : modal?.title}
          </h2>
          <button
            className="icon-button"
            aria-label="닫기"
            onClick={() => {
              setModal(null);
              setAuthOpen(false);
            }}
          >
            <X size={21} />
          </button>
        </div>
        {toast && (
          <p role="status" className="dialog-notice">
            {toast}
          </p>
        )}
        {authOpen ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const values = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              try {
                const response = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...values,
                    action: signup ? "signup" : "login",
                  }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                setAuthOpen(false);
                await refresh();
                setToast("환영합니다!");
              } catch (e) {
                setToast((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="muted">가까운 이웃과 좋은 연결을 시작하세요.</p>
            {signup && (
              <FieldInput
                field={{ key: "name", label: "이름", required: true }}
              />
            )}
            <FieldInput
              field={{
                key: "email",
                label: "이메일",
                type: "email",
                required: true,
              }}
            />
            <FieldInput
              field={{
                key: "password",
                label: "비밀번호 (10자 이상)",
                type: "password",
                required: true,
              }}
            />
            {signup && flags.quotes && (
              <label className="field">
                회원 유형
                <select name="role">
                  <option value="customer">일반 회원</option>
                  <option value="provider">업체 회원</option>
                </select>
              </label>
            )}
            <button className="primary full" disabled={busy}>
              {busy ? "처리 중…" : signup ? "가입하기" : "로그인"}
            </button>
            <button
              type="button"
              className="text-button full"
              onClick={() => setSignup(!signup)}
            >
              {signup
                ? "이미 계정이 있어요 · 로그인"
                : "처음이신가요? 회원가입"}
            </button>
            <p className="muted small">
              현재 로컬 테스트 환경입니다. 실사용 비밀번호나 개인정보를 입력하지
              마세요.
            </p>
          </form>
        ) : (
          modal && (
            <form
              key={modal.title}
              onSubmit={(e) => {
                e.preventDefault();
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                ) as Record<string, string>;
                run(async () => {
                  await modal.submit(values);
                  setModal(null);
                }, "저장했어요.");
              }}
            >
              {modal.title === "우리 업체의 견적 보내기" &&
                own("template").length > 0 && (
                  <label className="field">
                    저장한 템플릿
                    <select
                      onChange={(e) => {
                        const t = own("template").find(
                          (t) => t.id === e.target.value,
                        );
                        if (!t) return;
                        const form = e.currentTarget.form!;
                        for (const name of ["amount", "message", "scope"]) {
                          const input = form.elements.namedItem(
                            name,
                          ) as HTMLInputElement | null;
                          if (input) input.value = str(t[name]);
                        }
                      }}
                    >
                      <option value="">템플릿 선택</option>
                      {own("template").map((t) => (
                        <option value={t.id} key={t.id}>
                          {str(t.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              {modal.fields.map((f) => (
                <FieldInput key={f.key} field={f} />
              ))}
              {modal.button === "그냥 등록" && (
                <>
                  <div className="photo-strip">
                    {images.map((id) => (
                      <div key={id} data-upload-id={id}>
                        <img src={"/api/media?id=" + id} alt="업로드 사진" />
                        <button
                          type="button"
                          aria-label="사진 제거"
                          onClick={() =>
                            setImages(images.filter((i) => i !== id))
                          }
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <label className="upload-button">
                    <ImagePlus size={18} />
                    사진 추가 ({images.length}/5)
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={images.length >= 5 || busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) run(() => upload(file), "사진을 추가했어요.");
                      }}
                    />
                  </label>
                  <p className="muted small">
                    사진을 추가하면 이웃이 내용을 이해하기 쉬워요.
                    <br />
                    사진 없이도 바로 등록할 수 있어요.
                  </p>
                </>
              )}
              <button className="primary full" disabled={busy}>
                {busy ? "저장 중…" : modal.button || "저장하기"}
              </button>
            </form>
          )
        )}
      </dialog>
    </>
  );
}
