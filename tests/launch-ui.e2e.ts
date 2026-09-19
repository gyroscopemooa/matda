import { test, expect } from "@playwright/test";

test("Profile nickname, default avatars and uploaded photo survive refresh", async ({
  page,
}) => {
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "프로필테스트",
      email: crypto.randomUUID() + "@example.test",
      password: "profile-test-password",
    },
  });
  await page.goto("/my");
  await page.getByRole("button", { name: "프로필 수정", exact: true }).click();
  await page.getByLabel("닉네임", { exact: false }).fill("사진이웃");
  await page.getByRole("button", { name: "새싹", exact: true }).click();
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: /사진이웃/ })).toBeVisible();
  await page.getByRole("button", { name: "프로필 수정", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "새싹", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "orange";
    ctx.fillRect(0, 0, 64, 64);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator("dialog input[type=file]")
    .setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(page.locator("dialog .profile-photo")).toBeVisible();
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await page.reload();
  await expect(
    page.locator(".big-avatar .profile-photo").first(),
  ).toBeVisible();
});
test("Remote login exposes password recovery without requiring a login", async ({
  page,
}) => {
  await page.route("**/api/app", (route) =>
    route.fulfill({ json: { mode: "supabase", user: null, rows: [] } }),
  );
  let requested = false;
  await page.route("**/api/auth", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      action: "reset",
      email: "neighbor@example.test",
    });
    requested = true;
    await route.fulfill({
      json: { message: "가입된 이메일이라면 재설정 메일이 발송됩니다." },
    });
  });
  await page.goto("/my");
  await expect(page.locator(".preview-strip")).toHaveCount(0);
  await page
    .getByRole("button", { name: "로그인", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "비밀번호를 잊으셨나요?" }).click();
  await page.getByLabel("가입한 이메일").fill("neighbor@example.test");
  await page.getByRole("button", { name: "메일 보내기" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(requested).toBe(true);
  await expect(page.getByRole("status")).toContainText("재설정 메일");
});
test("Password change confirms matching values and handles expired recovery sessions", async ({
  page,
}) => {
  await page.route("**/api/auth", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "메일의 재설정 링크를 다시 열어주세요." },
    }),
  );
  await page.goto("/reset-password");
  await page
    .getByLabel("새 비밀번호", { exact: true })
    .fill("new-password-123");
  await page.getByLabel("비밀번호 확인").fill("different-password");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByRole("status")).toContainText(
    "두 비밀번호가 다릅니다",
  );
  await page.getByLabel("비밀번호 확인").fill("new-password-123");
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByRole("status")).toContainText("재설정 링크");
});
