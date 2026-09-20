import test from "node:test";
import assert from "node:assert/strict";
import { act, canRead, snapshot } from "../src/lib/domain";
import type { Database, Row, User } from "../src/lib/types";
const now = Date.parse("2026-09-18T00:00:00Z"),
  hour = 3600000;
const customer: User = {
  id: "customer",
  name: "고객",
  email: "c@example.test",
  password: "",
  role: "customer",
  region: "서울 강남구",
  createdAt: new Date(now).toISOString(),
};
const provider = (id = "provider"): User => ({
  ...customer,
  id,
  name: id,
  role: "provider",
});
const outsider = { ...customer, id: "outsider" };
const db = (): Database => ({
  users: [customer, provider(), outsider],
  sessions: [],
  rows: [],
});
const post = (d: Database, extra = {}) =>
  act(
    d,
    customer,
    "post.create",
    {
      body: "입주청소 요청",
      region: "서울 강남구",
      category: "청소",
      quoteEnabled: true,
      ...extra,
    },
    now,
  ) as Row;
const org = (d: Database) =>
  act(d, customer, "organization.create", { name: "테스트 기업" }, now) as Row;
const quote = (d: Database, p: Row, u = provider()) =>
  act(
    d,
    u,
    "quote.submit",
    { postId: p.id, amount: 120000, message: "청소 기본 견적" },
    now,
  ) as Row;
test("Phase 1: minimal post, CRUD author checks, category validation and duplicate rejection", () => {
  const d = db(),
    p = post(d, { quoteEnabled: false });
  assert.equal(p.title, "입주청소 요청");
  assert.throws(
    () =>
      act(
        d,
        outsider,
        "post.update",
        { id: p.id, body: "탈취", region: "서울 강남구", category: "청소" },
        now,
      ),
    /권한/,
  );
  assert.throws(() => post(d, { category: "불명" }), /카테고리/);
  assert.throws(() => post(d), /동일/);
  act(d, customer, "post.delete", { id: p.id }, now);
  assert.equal(canRead(d, p, outsider), false);
});
test("Phase 1: comment permissions and chat IDOR, unread, block", () => {
  const d = db(),
    p = post(d);
  const c = act(
    d,
    provider(),
    "comment.create",
    { postId: p.id, body: "안녕하세요" },
    now,
  ) as Row;
  assert.throws(() => act(d, outsider, "comment.delete", { id: c.id }), /권한/);
  const chat = act(
    d,
    provider(),
    "conversation.create",
    { targetId: p.id },
    now,
  ) as Row;
  const msg = act(
    d,
    provider(),
    "message.create",
    { conversationId: chat.id, body: "상담해요" },
    now,
  ) as Row;
  assert.equal(canRead(d, msg, outsider), false);
  assert.throws(
    () =>
      act(
        d,
        outsider,
        "message.create",
        { conversationId: chat.id, body: "침입" },
        now,
      ),
    /참여자/,
  );
  act(d, customer, "conversation.read", { id: chat.id }, now);
  assert.ok((msg.readBy as string[]).includes(customer.id));
  act(d, customer, "block.create", { targetId: provider().id }, now);
  assert.throws(
    () =>
      act(
        d,
        provider(),
        "message.create",
        { conversationId: chat.id, body: "차단후" },
        now,
      ),
    /차단/,
  );
});
test("Phase 2: 5/10 limit, own quote update and over-limit rejection", () => {
  const d = db(),
    p = post(d);
  for (let i = 0; i < 5; i++) quote(d, p, provider("p" + i));
  assert.throws(() => quote(d, p, provider("p5")), /한도/);
  quote(d, p, provider("p0"));
  assert.equal(d.rows.filter((r) => r.kind === "quote").length, 5);
  act(d, customer, "quote.expand", { id: p.id }, now);
  for (let i = 5; i < 10; i++) quote(d, p, provider("p" + i));
  assert.throws(() => quote(d, p, provider("p10")), /한도/);
  assert.equal(p.quoteLimit, 10);
});
test("Phase 2: 72h boundary, two extensions and 120h cap", () => {
  const d = db(),
    p = post(d);
  assert.equal(Date.parse(String(p.expiresAt)) - now, 72 * hour);
  assert.throws(
    () =>
      act(
        d,
        provider(),
        "quote.submit",
        { postId: p.id, amount: 1, message: "늦음" },
        now + 72 * hour,
      ),
    /마감/,
  );
  act(d, customer, "quote.extend", { id: p.id }, now + 72 * hour);
  assert.equal(Date.parse(String(p.expiresAt)), now + 96 * hour);
  act(d, customer, "quote.extend", { id: p.id }, now + 96 * hour);
  assert.equal(Date.parse(String(p.expiresAt)), now + 120 * hour);
  assert.throws(
    () => act(d, customer, "quote.extend", { id: p.id }, now),
    /연장/,
  );
});
test("Phase 2: category and total active request quotas", () => {
  const d = db();
  post(d, { body: "1" });
  post(d, { body: "2" });
  assert.throws(() => post(d, { body: "3" }), /한도/);
  for (const [i, category] of ["자동차", "수리·설치", "기타"].entries())
    post(d, { body: "다른" + i, category });
  assert.throws(() => post(d, { body: "여섯", category: "이사·운송" }), /한도/);
});
test("Phase 2: quote privacy, selection contact and independent confirmations", () => {
  const d = db(),
    p = post(d),
    q = quote(d, p);
  act(
    d,
    provider(),
    "provider.save",
    {
      name: "업체",
      intro: "소개",
      region: "서울 강남구",
      category: "청소",
      contact: "010-0000-0000",
    },
    now,
  );
  assert.equal(canRead(d, q, outsider), false);
  assert.equal(canRead(d, q, customer), true);
  assert.equal(
    snapshot(d, customer).rows.find((r) => r.kind === "provider")?.contact,
    undefined,
  );
  act(d, customer, "quote.select", { id: q.id }, now);
  assert.ok(!p.completedAt);
  assert.equal(
    snapshot(d, customer).rows.find((r) => r.kind === "provider")?.contact,
    "010-0000-0000",
  );
  assert.throws(
    () => act(d, outsider, "trade.confirm", { id: p.id, confirmed: true }),
    /참여자/,
  );
  act(d, customer, "trade.confirm", { id: p.id, confirmed: true }, now);
  assert.ok(!p.completedAt);
  act(d, provider(), "trade.confirm", { id: p.id, confirmed: true }, now);
  assert.ok(p.completedAt);
});
test("Phase 2: integer money, negative price, NaN and missing fields rejected", () => {
  for (const amount of [-1, 1.5, NaN, Infinity, 1e16]) {
    const d = db(),
      p = post(d);
    assert.throws(
      () =>
        act(
          d,
          provider(),
          "quote.submit",
          { postId: p.id, amount, message: "가격" },
          now,
        ),
      /금액/,
    );
  }
});
test("Phase 3: verification cannot self-approve; pending not verified", () => {
  const d = db();
  const p = act(
    d,
    provider(),
    "provider.save",
    {
      name: "업체",
      intro: "소개",
      region: "서울 강남구",
      category: "청소",
      contact: "010",
    },
    now,
  ) as Row;
  act(d, provider(), "verification.request", { note: "사업자 확인 요청" }, now);
  assert.equal(p.verification, "pending");
  assert.throws(
    () =>
      act(
        d,
        provider(),
        "admin.moderate",
        { id: p.id, status: "verified" },
        now,
      ),
    /관리자/,
  );
  act(
    d,
    provider(),
    "provider.save",
    {
      name: "업체",
      intro: "소개",
      region: "서울 강남구",
      category: "청소",
      contact: "010",
      verification: "verified",
    },
    now,
  );
  assert.equal(p.verification, "pending");
});
test("Phase 4/5: organization and workplace isolation, RFQ proposal privacy and deadline", () => {
  const d = db(),
    o = org(d);
  assert.equal(canRead(d, o, outsider), false);
  assert.throws(
    () =>
      act(
        d,
        outsider,
        "workplace.create",
        { orgId: o.id, name: "침입", region: "서울 강남구" },
        now,
      ),
    /구성원/,
  );
  const r = act(
    d,
    customer,
    "rfq.create",
    {
      orgId: o.id,
      title: "전기안전",
      body: "월간 점검",
      category: "전기·에너지",
      region: "서울 강남구",
      deadline: new Date(now + hour).toISOString(),
    },
    now,
  ) as Row;
  const proposal = act(
    d,
    provider(),
    "proposal.submit",
    { rfqId: r.id, amount: 500000, body: "점검 제안", duration: "1년" },
    now,
  ) as Row;
  assert.equal(canRead(d, proposal, outsider), false);
  assert.equal(canRead(d, proposal, customer), true);
  assert.throws(
    () =>
      act(
        d,
        provider(),
        "proposal.submit",
        { rfqId: r.id, amount: 1, body: "마감", duration: "1년" },
        now + hour,
      ),
    /마감/,
  );
});
function tenderFixture() {
  const d = db(),
    o = org(d);
  const t = act(
    d,
    customer,
    "tender.create",
    {
      orgId: o.id,
      title: "시설관리 입찰",
      body: "월간 관리",
      category: "시설·건물관리",
      region: "서울 강남구",
      deadline: new Date(now + hour).toISOString(),
      startAt: new Date(now).toISOString(),
      eligibility: "등록 업체",
      evaluation: "가격과 수행경험 종합평가",
    },
    now,
  ) as Row;
  act(d, customer, "tender.publish", { id: t.id }, now);
  return { d, t };
}
test("Phase 6: sealed bids, versions, withdrawal, deadline, opening and manual award", () => {
  const { d, t } = tenderFixture();
  const b = act(
    d,
    provider(),
    "bid.submit",
    { tenderId: t.id, amount: 900000, body: "최초 제안" },
    now,
  ) as Row;
  assert.equal(canRead(d, b, customer), false);
  assert.equal(canRead(d, b, { ...customer, role: "admin" }), false);
  assert.equal(canRead(d, b, outsider), false);
  act(
    d,
    provider(),
    "bid.submit",
    { tenderId: t.id, amount: 850000, body: "수정" },
    now + 1,
  );
  assert.equal((b.versions as unknown[]).length, 2);
  act(d, provider(), "bid.withdraw", { tenderId: t.id }, now + 2);
  assert.equal(b.status, "withdrawn");
  act(
    d,
    provider(),
    "bid.submit",
    { tenderId: t.id, amount: 840000, body: "재제출" },
    now + 3,
  );
  assert.throws(
    () =>
      act(
        d,
        provider(),
        "bid.submit",
        { tenderId: t.id, amount: 1, body: "마감후" },
        now + hour,
      ),
    /시간/,
  );
  assert.throws(
    () => act(d, provider(), "bid.withdraw", { tenderId: t.id }, now + hour),
    /시간/,
  );
  assert.throws(
    () => act(d, customer, "tender.open", { id: t.id }, now + hour - 1),
    /마감/,
  );
  assert.throws(
    () => act(d, outsider, "tender.open", { id: t.id }, now + hour),
    /구성원/,
  );
  act(d, customer, "tender.open", { id: t.id }, now + hour);
  assert.equal(canRead(d, b, customer), true);
  act(
    d,
    customer,
    "tender.award",
    { id: t.id, bidId: b.id, note: "조건과 가격 종합평가" },
    now + hour,
  );
  assert.equal(t.status, "awarded");
  assert.ok(
    d.rows.some((r) => r.kind === "audit" && r.action === "tender.award"),
  );
});
test("Phase 6: cancellation, failure and no-award states cannot reopen", () => {
  for (const status of ["cancelled", "failed", "no_award"]) {
    const { d, t } = tenderFixture();
    if (status !== "cancelled")
      act(d, customer, "tender.open", { id: t.id }, now + hour);
    act(
      d,
      customer,
      "tender.close",
      { id: t.id, status, note: "사유 기록" },
      now + hour,
    );
    assert.equal(t.status, status);
    assert.throws(
      () => act(d, customer, "tender.open", { id: t.id }, now + hour),
      /마감/,
    );
  }
});

test("Quote expiry is not reset by toggling, and declining completion removes completed state", () => {
  const d = db(),
    p = post(d);
  assert.throws(
    () =>
      act(
        d,
        customer,
        "post.update",
        {
          id: p.id,
          body: "수정",
          region: "서울 강남구",
          category: "청소",
          quoteEnabled: false,
        },
        now + hour,
      ),
    /일반 글/,
  );
  act(
    d,
    customer,
    "post.update",
    {
      id: p.id,
      body: "수정",
      region: "서울 강남구",
      category: "청소",
      quoteEnabled: true,
    },
    now + hour,
  );
  assert.equal(Date.parse(String(p.expiresAt)), now + 72 * hour);
  const q = quote(d, p);
  act(d, customer, "quote.select", { id: q.id }, now);
  act(d, customer, "trade.confirm", { id: p.id, confirmed: true }, now);
  act(d, provider(), "trade.confirm", { id: p.id, confirmed: true }, now);
  assert.ok(p.completedAt);
  act(d, customer, "trade.confirm", { id: p.id, confirmed: false }, now);
  assert.ok(!p.completedAt);
});

test("Leaving chat hides only the caller, preserves history and resurfaces on incoming message", () => {
  const d = db();
  const p = post(d);
  const chat = act(
    d,
    provider(),
    "conversation.create",
    { targetId: p.id },
    now,
  ) as Row;
  act(
    d,
    provider(),
    "message.create",
    { conversationId: chat.id, body: "hello" },
    now + 1,
  );
  assert.throws(() =>
    act(d, outsider, "conversation.leave", { id: chat.id }, now + 2),
  );
  act(d, customer, "conversation.leave", { id: chat.id }, now + 3);
  assert.equal(
    snapshot(d, customer).rows.some((r) => r.id === chat.id),
    false,
  );
  assert.equal(
    snapshot(d, provider()).rows.some((r) => r.id === chat.id),
    true,
  );
  assert.equal(d.rows.filter((r) => r.kind === "message").length, 1);
  act(
    d,
    provider(),
    "message.create",
    { conversationId: chat.id, body: "new" },
    now + 4,
  );
  assert.equal(
    snapshot(d, customer).rows.some((r) => r.id === chat.id),
    true,
  );
  act(d, customer, "conversation.leave", { id: chat.id }, now + 5);
  act(d, customer, "conversation.read", { id: chat.id }, now + 6);
  assert.equal(
    snapshot(d, customer).rows.some((r) => r.id === chat.id),
    true,
  );
});

test("Chat closure blocks both participants and keeps the record", () => {
  const d = db();
  const p = post(d);
  const chat = act(
    d,
    provider(),
    "conversation.create",
    { targetId: p.id },
    now,
  ) as Row;
  assert.throws(() =>
    act(d, outsider, "conversation.close", { id: chat.id }, now),
  );
  act(d, customer, "conversation.close", { id: chat.id }, now + 1);
  for (const u of [customer, provider()]) {
    assert.throws(
      () =>
        act(
          d,
          u,
          "message.create",
          { conversationId: chat.id, body: "blocked" },
          now + 2,
        ),
      /종료된/,
    );
    assert.equal(
      snapshot(d, u).rows.some((r) => r.id === chat.id),
      true,
    );
  }
  act(d, provider(), "conversation.create", { targetId: p.id }, now + 3);
  assert.throws(
    () =>
      act(
        d,
        provider(),
        "message.create",
        { conversationId: chat.id, body: "reopen" },
        now + 4,
      ),
    /종료된/,
  );
});
