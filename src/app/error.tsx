"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>잠시 연결이 원활하지 않아요</h1>
      <p>다시 시도해 주세요.</p>
      <button onClick={reset}>다시 불러오기</button>
    </main>
  );
}
