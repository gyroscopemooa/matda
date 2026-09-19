"use client";
import { useEffect, useState } from "react";

// Set to 1–4 to keep a favorite; null rotates once per document load.
const FIXED_CANDIDATE: number | null = null;
const candidates = [
  {
    eyebrow: "MAKE IT HAPPEN",
    title: "필요한 일이 있나요? 일단 올려죠.",
    description:
      "청소부터 웹·앱 제작까지, 맡기고 싶은 일과 궁금한 점을 나눠보세요.",
  },
  {
    eyebrow: "HELLO, NEIGHBOR",
    title: "가까운 이웃과, 더 나은 일상",
    description: "작은 질문부터 필요한 도움까지, 편하게 이야기해요.",
  },
  {
    eyebrow: "JUST SAY HAEJYO",
    title: "해죠 해줘 해주세요",
    description: "어떻게 말해도 좋아요. 맡기고 싶은 일, 해죠에 올려주세요.",
  },
  {
    eyebrow: "HELP ME, HAEJYO!",
    title: "누가 좀 해죠… 해죠에 말해죠!",
    description:
      "혼자 끙끙대던 일도, 미뤄둔 작업도. 필요한 도움을 글로 남겨보세요.",
  },
];
export default function RotatingWelcome() {
  const [index, setIndex] = useState((FIXED_CANDIDATE || 1) - 1);
  useEffect(() => {
    if (FIXED_CANDIDATE) return;
    try {
      const key = "haejyo-welcome-candidate";
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      const valid =
        Number.isInteger(saved?.index) &&
        saved.index >= 0 &&
        saved.index < candidates.length;
      const next = valid
        ? saved.document === performance.timeOrigin
          ? saved.index
          : (saved.index + 1) % candidates.length
        : 0;
      sessionStorage.setItem(
        key,
        JSON.stringify({ index: next, document: performance.timeOrigin }),
      );
      // Read browser storage after hydration; retain the same copy during navigation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIndex(next);
    } catch {
      /* Keep the initial copy when browser storage is unavailable. */
    }
  }, []);
  const copy = candidates[index];
  return (
    <div data-welcome-candidate={index + 1}>
      <div className="eyebrow">{copy.eyebrow}</div>
      <h1>{copy.title}</h1>
      <p>{copy.description}</p>
    </div>
  );
}
