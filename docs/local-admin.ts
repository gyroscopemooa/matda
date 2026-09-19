import { transact } from "../src/lib/store";
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("기존 계정 이메일을 입력해주세요.");
  await transact((db) => {
    const matches = db.users.filter((u) => u.email.toLowerCase() === email);
    if (matches.length !== 1)
      throw new Error("기존 계정이 정확히 하나인지 확인해주세요.");
    if (matches[0].disabled) throw new Error("이용 제한 계정입니다.");
    matches[0].role = "admin";
  });
  console.log(
    "Local administrator assigned. Refresh the preview. Remote permissions are unchanged.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
