import type { Row } from "./types";
import { matchesRegion } from "./regions";
export function popularPosts(rows: Row[], region: string, now = Date.now()) {
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  return rows
    .filter(
      (p) =>
        p.kind === "post" &&
        p.status === "published" &&
        p.audience === "consumer" &&
        !p.seed &&
        matchesRegion(String(p.region), region) &&
        Date.parse(p.createdAt) >= cutoff &&
        Date.parse(p.createdAt) <= now,
    )
    .map((post) => {
      const comments = rows.filter(
        (c) =>
          c.kind === "comment" &&
          c.postId === post.id &&
          c.status !== "hidden" &&
          c.status !== "deleted" &&
          c.ownerId !== post.ownerId &&
          Date.parse(c.createdAt) >= cutoff &&
          Date.parse(c.createdAt) <= now,
      );
      return {
        post,
        count: comments.length,
        score: new Set(comments.map((c) => c.ownerId)).size,
      };
    })
    .filter((p) => p.score >= 2)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.post.createdAt) - Date.parse(a.post.createdAt) ||
        a.post.id.localeCompare(b.post.id),
    )
    .slice(0, 3);
}
