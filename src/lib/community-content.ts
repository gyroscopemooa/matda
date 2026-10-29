import { normalizeCategory } from "./config";
import type { Row } from "./types";

type Topic =
  | Row
  | {
      title?: unknown;
      body?: unknown;
      intro?: unknown;
      category?: unknown;
    };
const subjects = [
  "입주청소",
  "에어컨",
  "이사",
  "용달",
  "누수",
  "보일러",
  "도어락",
  "도배",
  "욕실",
  "엔진오일",
  "자동차",
  "홈페이지",
  "웹",
  "앱",
  "로고",
  "촬영",
  "승강기",
  "소방",
  "폐기물",
  "전기",
  "정기청소",
  "사무실",
  "인테리어",
];
const topicText = (item: Topic) =>
  `${item.title || ""} ${item.body || item.intro || ""}`.replace(/\s/g, "");
export function relatedTopic(a: Topic, b: Topic): boolean {
  const category = normalizeCategory(String(a.category || ""));
  if (
    !category ||
    category === "기타" ||
    category !== normalizeCategory(String(b.category || ""))
  )
    return false;
  const left = topicText(a),
    right = topicText(b);
  return subjects.some((word) => left.includes(word) && right.includes(word));
}
export const publicCommunityPost = (post: Row) =>
  post.kind === "post" &&
  post.status === "published" &&
  post.audience !== "business";
export const indexablePost = (post: Row) =>
  publicCommunityPost(post) && !post.sample;

/** Mutual recent neighbours keep the links bidirectional and bounded. */
export function relatedPosts(post: Row, rows: Row[]): Row[] {
  if (!indexablePost(post)) return [];
  const eligible = rows.filter(indexablePost);
  const nearest = (source: Row) =>
    eligible
      .filter((other) => other.id !== source.id && relatedTopic(source, other))
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
      )
      .slice(0, 3);
  return nearest(post).filter((other) =>
    nearest(other).some((item) => item.id === post.id),
  );
}
