import { test, expect } from "@playwright/test";
test("free posts need no category or region and errors remain in the dialog", async ({
  page,
}) => {
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "자유글테스트",
      email: `${crypto.randomUUID()}@example.test`,
      password: "local-test-password",
    },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "자유글테스트 마이페이지" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "글쓰기·요청" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("글 종류").selectOption("자유");
  await expect(dialog.getByLabel("이야기 영역")).toHaveCount(0);
  await expect(dialog.locator("select[name=category]")).toHaveCount(0);
  await dialog.getByLabel("시/도", { exact: true }).selectOption("");
  await dialog
    .getByLabel("내용", { exact: false })
    .fill("지역 없이 쓰는 자유 이야기 " + crypto.randomUUID());
  await page.route("**/api/app", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 400,
        json: { error: "이미 등록한 내용입니다." },
      });
    } else await route.continue();
  });
  await dialog.getByRole("button", { name: "그냥 등록", exact: true }).click();
  const notice = dialog.getByRole("alert");
  await expect(notice).toContainText("이미 등록한 내용입니다.");
  await expect(notice).toBeInViewport();
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.unroute("**/api/app");
  await dialog.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/posts\//);
});
