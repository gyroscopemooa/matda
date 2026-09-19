import { test } from "node:test";
import assert from "node:assert/strict";
import { act } from "../src/lib/domain";
import { seed } from "../src/lib/store";
import type { User } from "../src/lib/types";

test("Profile updates only the caller and rejects invalid avatars atomically", () => {
  const db = seed();
  const user: User = {
    id: "me",
    name: "old",
    email: "me@example.test",
    password: "unused",
    role: "customer",
    region: "",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  db.rows.push({
    ...db.rows[0],
    id: "mine",
    ownerId: user.id,
    authorName: "old",
  });
  act(db, user, "profile.update", {
    name: "새 이웃",
    avatar: "leaf",
    region: "",
    role: "admin",
  });
  assert.equal(user.name, "새 이웃");
  const media = { ...db.rows[0], id: "photo", kind: "media", ownerId: "someone-else", visibility: "public", mime: "image/webp" };
  db.rows.push(media);
  assert.throws(() => act(db, user, "profile.update", { name: "새 이웃", avatar: "media:photo" }));
  media.ownerId = user.id;
  media.visibility = "private";
  assert.throws(() => act(db, user, "profile.update", { name: "새 이웃", avatar: "media:photo" }));
  media.visibility = "public";
  act(db, user, "profile.update", { name: "새 이웃", avatar: "media:photo" });
  assert.equal(user.avatar, "media:photo");
  db.rows.pop();
  act(db, user, "profile.update", { name: "새 이웃", avatar: "leaf" });
  assert.equal(user.role, "customer");
  assert.equal(db.rows.at(-1)?.authorAvatar, "leaf");
  assert.equal(db.rows.at(-1)?.authorName, "새 이웃");
  assert.equal(db.rows[0].authorName, "따뜻한이웃");
  assert.throws(() =>
    act(db, user, "profile.update", { name: "changed", avatar: "invalid" }),
  );
  assert.equal(user.name, "새 이웃");
});
