import { test, expect } from "@playwright/test";
test("Free posts and regional popular list", async ({ page, playwright }) => {
  const headers = { origin: "http://127.0.0.1:3108" };
  await page.request.post("/api/auth", {
    headers,
    data: {
      action: "signup",
      email: `free-${Date.now()}@example.test`,
      name: "자유작성",
      password: "popular-test-pass",
    },
  });
  await page.goto("/");
  await page.locator(".user-chip").waitFor();
  await page
    .getByRole("button", { name: "글쓰기", exact: true })
    .first()
    .click();
  await page.locator("select[name=type]").selectOption("자유");
  await page.locator("select[name=category]").selectOption("");
  await page
    .getByLabel("내용", { exact: false })
    .fill("야음동 산책 이야기 인기글 검증");
  await page.getByLabel("시/도", { exact: true }).selectOption("울산광역시");
  await page.getByLabel("시/군/구", { exact: true }).selectOption("남구");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page).toHaveURL(/posts\//);
  const id = page.url().split("/").pop();
  for (let i = 0; i < 2; i++) {
    const ctx = await playwright.request.newContext({
      baseURL: "http://127.0.0.1:3108",
      extraHTTPHeaders: headers,
    });
    await ctx.post("/api/auth", {
      data: {
        action: "signup",
        email: `reader-${i}-${Date.now()}@example.test`,
        name: `이웃${i}`,
        password: "popular-test-pass",
      },
    });
    const r = await ctx.post("/api/app", {
      data: {
        action: "comment.create",
        input: { postId: id, body: "좋은 동네 이야기예요" },
      },
    });
    expect(r.ok()).toBeTruthy();
    await ctx.dispose();
  }
  await page.goto("/community");
  await expect(
    page.getByRole("region", { name: "우리 동네 인기글" }),
  ).toContainText("야음동 산책 이야기 인기글 검증");
  await page
    .getByRole("region", { name: "우리 동네 인기글" })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(new RegExp(id!));
  await page.goto("/community");
  await page
    .getByRole("button", { name: "커뮤니티 지역 선택", exact: true })
    .click();
  await page.getByLabel("시/도", { exact: true }).selectOption("부산광역시");
  await page.getByRole("button", { name: "적용하기", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "우리 동네 인기글" }),
  ).toHaveCount(0);
});
