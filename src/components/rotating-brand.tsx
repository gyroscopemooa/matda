"use client";
import { useEffect, useState } from "react";

// Set to 1–7 to keep a chosen logo; null enables the comparison rotation.
const FIXED_CANDIDATE: number | null = null;
export default function RotatingBrand() {
  const [candidate, setCandidate] = useState(FIXED_CANDIDATE || 1);
  useEffect(() => {
    if (FIXED_CANDIDATE) return;
    try {
      const key = "haejyo-brand-candidate";
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      const previous = Number.isInteger(saved?.index) && saved.index >= 1 && saved.index <= 7 ? saved.index : 0;
      const index = saved?.document === performance.timeOrigin && previous ? previous : previous % 7 + 1;
      sessionStorage.setItem(key, JSON.stringify({ index, document: performance.timeOrigin }));
      // Browser-only storage is read after hydration to match the server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCandidate(index);
    } catch { /* Storage-disabled browsers keep the first candidate. */ }
  }, []);
  return <span className="brand-candidate" data-brand-candidate={candidate} title={`로고 후보 ${candidate}/7`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={`/brand/candidate-${candidate}.webp`} alt="해죠 · 좋은 이웃, 좋은 연결" width="156" height="66" />
  </span>;
}
