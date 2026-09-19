"use client";
import { useState } from "react";
const choices = { sun: "☀️", leaf: "🌱", smile: "😊" };
export function Avatar({ value = "sun" }: { value?: string }) {
  return value.startsWith("media:") ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="profile-photo"
      src={"/api/media?id=" + encodeURIComponent(value.slice(6))}
      alt="프로필 사진"
    />
  ) : (
    <>{choices[value as keyof typeof choices] || choices.sun}</>
  );
}
export default function ProfileAvatar({ value = "sun" }: { value?: string }) {
  const [selected, setSelected] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <fieldset className="profile-avatar-picker">
      <legend>프로필 이미지</legend>
      <input type="hidden" name="avatar" value={selected} />
      <span className="big-avatar">
        <Avatar value={selected} />
      </span>
      <div className="avatar-options">
        {Object.entries(choices).map(([id, symbol]) => (
          <button
            type="button"
            key={id}
            aria-pressed={selected === id}
            aria-label={id === "sun" ? "햇살" : id === "leaf" ? "새싹" : "미소"}
            onClick={() => setSelected(id)}
          >
            {symbol}
          </button>
        ))}
      </div>
      <label className="upload-button">
        {busy ? "사진 업로드 중…" : "내 사진 업로드"}
        <input
          disabled={busy}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setError("");
            setBusy(true);
            try {
              if (file.size > 2 * 1024 * 1024)
                throw new Error("사진은 2MB 이하로 선택해주세요.");
              const bitmap = await createImageBitmap(file);
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 512;
              const edge = Math.min(bitmap.width, bitmap.height);
              canvas
                .getContext("2d")!
                .drawImage(
                  bitmap,
                  (bitmap.width - edge) / 2,
                  (bitmap.height - edge) / 2,
                  edge,
                  edge,
                  0,
                  0,
                  512,
                  512,
                );
              bitmap.close();
              const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/webp", 0.85),
              );
              if (!blob) throw new Error("사진을 처리하지 못했어요.");
              const form = new FormData();
              form.set("file", blob, "profile.webp");
              form.set("visibility", "public");
              const response = await fetch("/api/media", {
                method: "POST",
                body: form,
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setSelected("media:" + result.media.id);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "사진 업로드에 실패했어요.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <p>
        JPG·PNG·WebP, 최대 2MB · 가운데를 정사각형으로 맞춥니다. 저장하면 공개
        프로필에 표시됩니다.
      </p>
      {error && <p role="alert">{error}</p>}
      {busy && (
        <input
          aria-label="사진 업로드 완료 대기"
          required
          value=""
          onChange={() => {}}
          className="upload-pending"
        />
      )}
    </fieldset>
  );
}
