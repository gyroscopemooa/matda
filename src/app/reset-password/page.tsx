"use client";
import { useState } from "react";
import Link from "next/link";
export default function ResetPassword() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <main
      className="panel"
      style={{ maxWidth: 440, margin: "60px auto", padding: 24 }}
    >
      <h1>새 비밀번호 설정</h1>
      <p>재설정 메일의 링크를 연 뒤 새 비밀번호를 입력해주세요.</p>
      {!done && (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            if (values.get("password") !== values.get("confirm")) {
              setMessage("두 비밀번호가 다릅니다.");
              return;
            }
            setBusy(true);
            try {
              const response = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "update-password",
                  password: values.get("password"),
                }),
              });
              const result = await response.json();
              setMessage(result.error || result.message);
              setDone(response.ok);
            } catch {
              setMessage("연결에 실패했어요. 다시 시도해주세요.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            새 비밀번호
            <input
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </label>
          <label className="field">
            비밀번호 확인
            <input
              name="confirm"
              type="password"
              minLength={10}
              maxLength={128}
              required
              autoComplete="new-password"
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      )}
      <p role="status">{message}</p>
      <Link href="/">홈으로 돌아가기</Link>
    </main>
  );
}
