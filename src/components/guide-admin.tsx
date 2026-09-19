"use client";
import { useEffect, useState } from "react";
import type { GuideContent } from "@/lib/guide-content";
type Article = {
  slug: string;
  status: string;
  content: GuideContent;
  generation_day: string;
};
type Run = {
  day: string;
  status: string;
  attempts: number;
  error: string | null;
};
export default function GuideAdmin() {
  const [articles, setArticles] = useState<Article[]>([]),
    [runs, setRuns] = useState<Run[]>([]),
    [selected, setSelected] = useState<Article | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [reviewed, setReviewed] = useState(false);
  async function load() {
    const r = await fetch("/api/guides/admin", { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setArticles(data.articles);
    setRuns(data.runs);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/guides/admin", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setArticles(data.articles);
        setRuns(data.runs);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setNotice(e.message);
      });
    return () => controller.abort();
  }, []);
  async function send(body: unknown) {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/guides/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await load();
      setSelected(null);
      setReviewed(false);
      setNotice(
        data.status === "skipped"
          ? "오늘 초안이 이미 있거나 생성 중입니다. 실패 시 하루 최대 3회 시도합니다."
          : "처리했습니다.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setBusy(false);
    }
  }
  function edit(key: keyof GuideContent, value: unknown) {
    if (selected) {
      setSelected({
        ...selected,
        content: { ...selected.content, [key]: value },
      });
      setReviewed(false);
    }
  }
  return (
    <section className="panel guide-admin">
      <h2>가이드 편집실</h2>
      <p>
        AI 초안은 검수 후 발행합니다. 실제 가격·법률·안전 관련 표현은 공식
        자료와 대조해주세요.
      </p>
      <button disabled={busy} onClick={() => send({ action: "generate" })}>
        {busy ? "처리 중…" : "오늘 초안 생성 / 실패 재시도"}
      </button>
      <p role="status">{notice}</p>
      <details>
        <summary>최근 생성 기록</summary>
        {runs.map((r) => (
          <p key={r.day}>
            {r.day} · {r.status} · 시도 {r.attempts}/3 {r.error || ""}
          </p>
        ))}
      </details>
      <div className="guide-admin-list">
        {articles.map((a) => (
          <button
            key={a.slug}
            disabled={busy}
            onClick={() => {
              setSelected(structuredClone(a));
              setReviewed(false);
            }}
          >
            {a.generation_day} ·{" "}
            {a.status === "published"
              ? "발행"
              : a.status === "held"
                ? "보류"
                : "초안"}{" "}
            · {a.content.title}
          </button>
        ))}
      </div>
      {selected && (
        <fieldset disabled={busy}>
          <legend>초안 수정</legend>
          <label className="field">
            제목
            <input
              value={selected.content.title}
              maxLength={120}
              onChange={(e) => edit("title", e.target.value)}
            />
          </label>
          <label className="field">
            소개
            <textarea
              value={selected.content.intro}
              maxLength={500}
              onChange={(e) => edit("intro", e.target.value)}
            />
          </label>
          {selected.content.sections.map((s, i) => (
            <div key={i}>
              <label className="field">
                소제목 {i + 1}
                <input
                  value={s.heading}
                  onChange={(e) =>
                    edit(
                      "sections",
                      selected.content.sections.map((v, n) =>
                        n === i ? { ...v, heading: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                본문 {i + 1}
                <textarea
                  rows={5}
                  value={s.body}
                  onChange={(e) =>
                    edit(
                      "sections",
                      selected.content.sections.map((v, n) =>
                        n === i ? { ...v, body: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <label className="field">
            체크리스트 (한 줄에 하나)
            <textarea
              rows={5}
              value={selected.content.checks.join("\n")}
              onChange={(e) => edit("checks", e.target.value.split("\n"))}
            />
          </label>
          <label className="field">
            요청 양식
            <textarea
              rows={5}
              value={selected.content.template}
              onChange={(e) => edit("template", e.target.value)}
            />
          </label>
          <label className="field">
            확인한 출처 (HTTPS 주소, 한 줄에 하나)
            <textarea
              value={selected.content.sources.join("\n")}
              onChange={(e) =>
                edit("sources", e.target.value.split("\n").filter(Boolean))
              }
            />
          </label>
          <p>검수 메모: {selected.content.reviewNotes || "없음"}</p>
          <label>
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />{" "}
            사실·출처·권리·안전 관련 표현을 확인했습니다.
          </label>
          <div className="guide-actions">
            {[
              ["draft", "초안 저장"],
              ["held", "보류"],
              ["published", "검수 후 발행"],
            ].map(([status, label]) => (
              <button
                key={status}
                disabled={busy || (status === "published" && !reviewed)}
                onClick={() =>
                  send({
                    slug: selected.slug,
                    content: selected.content,
                    status,
                    reviewed,
                  })
                }
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </section>
  );
}
