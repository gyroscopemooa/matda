import { test } from "node:test";
import assert from "node:assert/strict";
import { popularPosts } from "../src/lib/popular";
import type { Row } from "../src/lib/types";
const now = Date.now();
const row = (
  id: string,
  kind: string,
  extra: Record<string, unknown>,
): Row => ({
  id,
  kind,
  ownerId: id,
  createdAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
  ...extra,
});
test("Popular posts use unique non-author commenters, region, visibility and recent window", () => {
  const p = row("p", "post", {
    status: "published",
    audience: "consumer",
    region: "울산 남구",
    ownerId: "author",
  });
  const a = row("a", "comment", { postId: "p", ownerId: "alice" }),
    b = row("b", "comment", { postId: "p", ownerId: "bob" });
  assert.equal(
    popularPosts(
      [
        p,
        a,
        { ...a, id: "repeat" },
        row("self", "comment", { postId: "p", ownerId: "author" }),
      ],
      "울산",
      now,
    ).length,
    0,
  );
  assert.equal(popularPosts([p, a, b], "울산", now).length, 1);
  assert.equal(popularPosts([p, a, b], "부산", now).length, 0);
  assert.equal(
    popularPosts([{ ...p, status: "hidden" }, a, b], "울산", now).length,
    0,
  );
  assert.equal(
    popularPosts([p, a, { ...b, status: "hidden" }], "울산", now).length,
    0,
  );
  assert.equal(
    popularPosts([{ ...p, createdAt: "2000-01-01" }, a, b], "울산", now).length,
    0,
  );
});
