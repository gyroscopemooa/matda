import test from "node:test";
import assert from "node:assert/strict";
import { act } from "../src/lib/domain";
import type { Database, Row, User } from "../src/lib/types";

const owner: User = {
  id: "owner",
  name: "고객",
  email: "",
  password: "",
  role: "customer",
  region: "서울 강남구",
  createdAt: "2026-01-01T00:00:00Z",
};
const created = Date.parse(owner.createdAt);
const converted = created + 30 * 86400000;
function fixture(serviceMode = "local") {
  const db: Database = { users: [owner], rows: [], sessions: [] };
  const post = act(
    db,
    owner,
    "post.create",
    {
      body: "기존 요청을 그대로 사용",
      category: "청소",
      region: owner.region,
      serviceMode,
    },
    created,
  ) as Row;
  return { db, post };
}
test("Conversion keeps the original post and relationships, is consented and idempotent, and starts a fresh 72-hour window", () => {
  for (const mode of ["local", "online"]) {
    const { db, post } = fixture(mode);
    const comment = act(
      db,
      owner,
      "comment.create",
      { postId: post.id, body: "기존 댓글" },
      created,
    ) as Row;
    const original = { ...post };
    assert.throws(
      () => act(db, owner, "quote.enable", { id: post.id }, converted),
      /동의/,
    );
    assert.throws(
      () =>
        act(
          db,
          { ...owner, id: "other" },
          "quote.enable",
          { id: post.id, consent: true },
          converted,
        ),
      /권한/,
    );
    act(db, owner, "quote.enable", { id: post.id, consent: true }, converted);
    assert.equal(post.id, original.id);
    assert.equal(post.body, original.body);
    assert.equal(post.createdAt, original.createdAt);
    assert.equal(post.region, original.region);
    assert.deepEqual(post.images, original.images);
    assert.equal(comment.postId, post.id);
    assert.equal(
      post.expiresAt,
      new Date(converted + 72 * 3600000).toISOString(),
    );
    act(
      db,
      owner,
      "quote.enable",
      { id: post.id, consent: true },
      converted + 3600000,
    );
    assert.equal(db.rows.filter((r) => r.kind === "post").length, 1);
    assert.equal(post.quoteStartedAt, new Date(converted).toISOString());
    act(db, owner, "quote.extend", { id: post.id }, converted);
    act(db, owner, "quote.extend", { id: post.id }, converted);
    assert.equal(
      post.expiresAt,
      new Date(converted + 120 * 3600000).toISOString(),
    );
    assert.throws(
      () => act(db, owner, "quote.extend", { id: post.id }, converted),
      /연장/,
    );
  }
});
test("Conversion rejects samples, hidden posts, other types, limit bypass and silent toggles", () => {
  for (const extra of [
    { sample: true },
    { status: "hidden" },
    { type: "question" },
    { audience: "business" },
  ]) {
    const { db, post } = fixture();
    Object.assign(post, extra);
    assert.throws(
      () =>
        act(
          db,
          owner,
          "quote.enable",
          { id: post.id, consent: true },
          converted,
        ),
      /전환/,
    );
  }
  const { db, post } = fixture();
  const fields = {
    id: post.id,
    body: post.body,
    region: owner.region,
    category: "청소",
    quoteEnabled: true,
  };
  assert.throws(
    () => act(db, owner, "post.update", fields, converted),
    /전환 버튼/,
  );
  act(db, owner, "quote.enable", { id: post.id, consent: true }, converted);
  assert.throws(
    () =>
      act(
        db,
        owner,
        "post.update",
        { ...fields, quoteEnabled: false },
        converted,
      ),
    /일반 글/,
  );
  assert.throws(
    () =>
      act(
        db,
        owner,
        "post.update",
        { ...fields, category: "자동차" },
        converted,
      ),
    /분야/,
  );
  for (let index = 0; index < 2; index++) {
    const next = act(
      db,
      owner,
      "post.create",
      { body: `다른 요청 ${index}`, category: "청소", region: owner.region },
      converted,
    ) as Row;
    if (index === 0)
      act(db, owner, "quote.enable", { id: next.id, consent: true }, converted);
    else
      assert.throws(
        () =>
          act(
            db,
            owner,
            "quote.enable",
            { id: next.id, consent: true },
            converted,
          ),
        /한도/,
      );
  }
});
