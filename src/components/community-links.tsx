import Link from "next/link";
import type { Row } from "@/lib/types";
import type { Guide } from "@/lib/guides";
import { relatedPosts, relatedTopic } from "@/lib/community-content";

export default function CommunityLinks({
  post,
  rows,
  guides,
  onWrite,
}: {
  post: Row;
  rows: Row[];
  guides: Guide[];
  onWrite: () => void;
}) {
  const posts = relatedPosts(post, rows);
  const articles = guides
    .filter(
      (guide) => guide.status === "published" && relatedTopic(post, guide),
    )
    .slice(0, 3);
  return (
    <aside className="panel" aria-label="관련 안내">
      {!!posts.length && (
        <section>
          <h2>같은 주제의 최근 글</h2>
          <ul>
            {posts.map((item) => (
              <li key={item.id}>
                <Link href={`/posts/${item.id}`}>{String(item.title)}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!!articles.length && (
        <section>
          <h2>함께 확인할 가이드</h2>
          <ul>
            {articles.map((guide) => (
              <li key={guide.slug}>
                <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <h2>내 상황도 함께 이야기해요</h2>
      <p>커뮤니티에 질문이나 필요한 일을 올리고 댓글로 이야기를 나눠보세요.</p>
      <button className="primary" onClick={onWrite}>
        내 질문·요청 글 작성하기
      </button>
    </aside>
  );
}
