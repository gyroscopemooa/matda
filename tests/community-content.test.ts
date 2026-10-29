import test from "node:test";
import assert from "node:assert/strict";
import {
  indexablePost,
  relatedPosts,
  relatedTopic,
} from "../src/lib/community-content";
import { act } from "../src/lib/domain";
import type { Row, User, Database } from "../src/lib/types";

const post = (id: string, extra = {}): Row => ({
  id,
  kind: "post",
  ownerId: "owner",
  status: "published",
  title: "입주청소 준비 사진",
  body: "입주청소 전 사진을 준비해요",
  category: "청소·관리",
  createdAt: `2026-10-${id.padStart(2, "0")}T00:00:00Z`,
  updatedAt: "2026-10-29T00:00:00Z",
  ...extra,
});
test("related links need both a shared subject and category, and exclude hidden/sample/business posts", () => {
  const source = post("01");
  const relevant = post("02", { category: "청소" });
  const rows = [
    source,
    relevant,
    post("03", { title: "방역 준비", body: "벌레 방역" }),
    post("04", { status: "hidden" }),
    post("05", { sample: true }),
    post("06", { audience: "business" }),
  ];
  assert.deepEqual(
    relatedPosts(source, rows).map((r) => r.id),
    ["02"],
  );
  assert.deepEqual(
    relatedPosts(relevant, rows).map((r) => r.id),
    ["01"],
  );
  assert.equal(
    relatedTopic(source, { category: "기타", title: source.title }),
    false,
  );
  assert.equal(indexablePost(post("07", { sample: true })), false);
});
test("recent recommendations remain bounded and bidirectional even with many old articles", () => {
  const rows = Array.from({ length: 9 }, (_, i) => post(String(i + 1)));
  for (const source of rows) {
    const related = relatedPosts(source, rows);
    assert.ok(related.length <= 3);
    for (const other of related)
      assert.ok(relatedPosts(other, rows).some((r) => r.id === source.id));
  }
});
test("manual editorial posts use existing ownership permissions", () => {
  const owner: User = {
    id: "operator",
    role: "admin",
    name: "운영팀",
    email: "operator@example.test",
    password: "",
    region: "",
    createdAt: new Date().toISOString(),
  };
  const db: Database = { rows: [], users: [owner], sessions: [] };
  const created = act(db, owner, "post.create", {
    type: "free",
    title: "질문 하나의 답",
    body: "직접 확인한 안내",
    images: [],
  }) as Row;
  assert.equal(created.status, "published");
  assert.throws(
    () =>
      act(db, { ...owner, id: "other-admin" }, "post.update", {
        id: created.id,
        type: "free",
        body: "무단 수정",
      }),
    /접근 권한/,
  );
  act(db, owner, "post.update", {
    id: created.id,
    type: "free",
    body: "직접 수정한 안내",
  });
  assert.equal(created.body, "직접 수정한 안내");
});
