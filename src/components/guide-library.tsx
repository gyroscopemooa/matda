"use client";
import Link from "next/link";
import { useState } from "react";
import { categories } from "@/lib/config";
import { publishedGuides, type Guide } from "@/lib/guides";

export default function GuideLibrary({
  slug,
  articles = publishedGuides,
  onRequest,
}: {
  slug?: string;
  articles?: Guide[];
  onRequest: (guide: Guide) => void;
}) {
  const [category, setCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const guide = articles.find((g) => g.slug === slug);
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("복사했어요.");
    } catch {
      setNotice("복사하지 못했어요. 아래 내용을 직접 선택해 복사해주세요.");
    }
  }
  if (slug && !guide)
    return (
      <section className="panel">
        <h1>가이드를 찾을 수 없어요</h1>
        <Link href="/guides">가이드 목록</Link>
      </section>
    );
  if (guide)
    return (
      <article className="guide-detail panel">
        <Link href="/guides">← 해죠 가이드</Link>
        <p className="eyebrow">{guide.category} · 요청 준비</p>
        <h1>{guide.title}</h1>
        <p className="muted">
          {guide.author} · 업데이트 {guide.updatedAt}
        </p>
        <p>{guide.intro}</p>
        {guide.autoPublished && (
          <p className="muted small">
            AI를 활용해 자동 작성·발행한 일반 정보입니다. 실제 의뢰 조건은
            서비스 제공자와 확인해주세요.
          </p>
        )}
        {guide.sections?.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{section.body}</p>
          </section>
        ))}
        {!!guide.sources?.length && (
          <section>
            <h2>참고 자료</h2>
            {guide.sources.map((url) => (
              <p key={url}>
                <a href={url} rel="noopener noreferrer" target="_blank">
                  {url}
                </a>
              </p>
            ))}
          </section>
        )}
        <h2>요청 전 체크리스트</h2>
        <ol>
          {guide.checks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <p className="muted">
          해죠 운영팀이 정리한 요청 작성 가이드입니다. 실제 이용자의 후기나 거래
          사례가 아닙니다.
        </p>
        <h2>내 요청에 맞게 채워보세요</h2>
        <pre>{guide.template}</pre>
        <div className="guide-actions">
          <button onClick={() => copy(guide.template)}>양식 복사</button>
          <button onClick={() => copy(window.location.href)}>링크 복사</button>
        </div>
        <p role="status">{notice}</p>
        <section className="guide-cta">
          <h2>맡기고 싶은 일이 있나요?</h2>
          <p>
            이 양식과 카테고리를 가져와 요청 글을 작성해보세요. 사진·일정·예산은
            선택입니다.
          </p>
          <button className="primary" onClick={() => onRequest(guide)}>
            이 내용으로 요청 글 작성하기
          </button>
        </section>
        <h2>함께 읽어보세요</h2>
        <div className="guide-grid">
          {articles
            .filter((g) => g.slug !== slug)
            .slice(0, 2)
            .map((g) => (
              <Link className="panel" href={"/guides/" + g.slug} key={g.slug}>
                {g.title}
              </Link>
            ))}
        </div>
      </article>
    );
  const filtered = articles.filter(
    (g) =>
      (category === "전체" || g.category === category) &&
      (g.title + g.intro + g.category).includes(query.trim()),
  );
  return (
    <section className="guide-library">
      <div className="welcome">
        <div className="eyebrow">HAEJYO GUIDE</div>
        <h1>해죠 가이드</h1>
        <p>
          처음 맡겨도 어렵지 않게. 필요한 일을 정리하고, 물어볼 내용을 준비해요.
        </p>
      </div>
      <label className="field">
        가이드 검색
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="청소, 이사, 웹사이트…"
        />
      </label>
      <div className="service-filter" aria-label="가이드 카테고리">
        {[
          "전체",
          ...Array.from(
            new Set([...categories, ...articles.map((g) => g.category)]),
          ),
        ].map((c) => (
          <button
            aria-pressed={category === c}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="guide-grid">
        {filtered.map((g) => (
          <Link
            className="panel guide-card"
            key={g.slug}
            href={"/guides/" + g.slug}
          >
            <small>{g.category}</small>
            <h2>{g.title}</h2>
            <p>{g.intro}</p>
            <span>해죠 운영팀 · 체크리스트와 요청 양식 →</span>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <p>
          조건에 맞는 가이드가 없어요. 다른 검색어나 카테고리를 선택해주세요.
        </p>
      )}
    </section>
  );
}
