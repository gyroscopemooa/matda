import test from "node:test";
import assert from "node:assert/strict";
import { act, snapshot } from "../src/lib/domain";
import { proposalTerms, proposalPrice } from "../src/lib/proposals";
import type { Database, Row, User } from "../src/lib/types";
test("Proposal types validate ranges and keep inspection prices unknown", () => {
  assert.throws(() => proposalTerms({ amount: "" }));
  assert.throws(() =>
    proposalTerms({
      proposalType: "estimate",
      amount: 20,
      amountMax: 10,
      priceCondition: "면적",
    }),
  );
  assert.throws(() =>
    proposalTerms({
      proposalType: "inspection",
      inspectionReason: "사진",
      visitSlots: "내일",
    }),
  );
  const q = proposalTerms({
    proposalType: "inspection",
    inspectionReason: "사진",
    visitSlots: "내일",
    visitFee: 0,
  });
  assert.equal(q.amount, null);
  assert.match(proposalPrice(q as unknown as Row), /가격 미정/);
});
test("Shared questions deduplicate, protect answers and finalize a proposal after recruitment expiry", () => {
  const buyer = {
    id: "buyer",
    name: "고객",
    email: "b@example.test",
    password: "",
    role: "customer",
    region: "",
    createdAt: new Date().toISOString(),
  } as User;
  const seller = { ...buyer, id: "seller", role: "provider" } as User;
  const other = { ...seller, id: "other" };
  const stranger = { ...buyer, id: "stranger" };
  const db: Database = {
    users: [buyer, seller, other, stranger],
    rows: [],
    sessions: [],
  };
  const p = act(db, buyer, "post.create", {
    type: "request",
    body: "공통 정보 테스트",
    category: "제작·디지털",
    serviceMode: "online",
    quoteEnabled: true,
  }) as Row;
  const q = act(db, seller, "quote.submit", {
    postId: p.id,
    proposalType: "inspection",
    inspectionReason: "사진 필요",
    visitSlots: "내일",
    visitFee: 0,
    message: "확인 후",
  }) as Row;
  act(db, other, "quote.submit", {
    postId: p.id,
    amount: 100,
    message: "확정",
  });
  assert.throws(() => act(db, buyer, "quote.select", { id: q.id }), /확정/);
  const question = act(db, seller, "quote.question", {
    postId: p.id,
    question: "엘리베이터 있나요?",
  }) as Row;
  assert.equal(
    (
      act(db, other, "quote.question", {
        postId: p.id,
        question: "엘리베이터  있나요?",
      }) as Row
    ).id,
    question.id,
  );
  assert.throws(() =>
    act(db, seller, "quote.answer", {
      id: question.id,
      answer: "있음",
      shareConsent: true,
    }),
  );
  assert.throws(
    () => act(db, buyer, "quote.answer", { id: question.id, answer: "있음" }),
    /동의/,
  );
  act(db, buyer, "quote.answer", {
    id: question.id,
    answer: "있음",
    shareConsent: true,
  });
  assert.equal(
    snapshot(db, other).rows.find((r) => r.id === question.id)?.answer,
    "있음",
  );
  assert.equal(
    snapshot(db, stranger).rows.some((r) => r.id === question.id),
    false,
  );
  assert.equal(
    snapshot(db).rows.some((r) => r.id === question.id),
    false,
  );
  const later = Date.now() + 74 * 3600000;
  act(
    db,
    seller,
    "quote.submit",
    { postId: p.id, amount: 150, message: "최종 견적" },
    later,
  );
  assert.equal(db.rows.filter((r) => r.kind === "quote").length, 2);
  act(db, buyer, "quote.select", { id: q.id }, later);
  assert.throws(() =>
    act(
      db,
      seller,
      "quote.submit",
      { postId: p.id, amount: 200, message: "선택 후 수정" },
      later,
    ),
  );
});
