import { test, expect } from "@playwright/test";
test("Digital requests work without region and remain discoverable across local filters", async ({
  page,
}) => {
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "디지털요청자",
      email: crypto.randomUUID() + "@example.test",
      password: "digital-test-password",
    },
  });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "디지털요청자 마이페이지", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "필요한 일이 있나요? 일단 올려죠." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "글쓰기", exact: true })
    .first()
    .click();
  await page.locator('select[name="category"]').selectOption("제작·디지털");
  await page.getByRole("radio", { name: "전국·온라인 가능" }).check();
  await expect(page.getByLabel("시/도", { exact: true })).toHaveCount(0);
  const body = "홈페이지 제작을 맡길 분을 찾아요 " + Date.now();
  await page.getByLabel("내용", { exact: false }).fill(body);
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page).toHaveURL(/posts\//);
  await expect(page.locator(".detail-region")).toHaveText("전국 · 온라인");
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "전국·온라인 가능" }),
  ).toBeChecked();
  await expect(page.locator('select[name="category"]')).toHaveValue(
    "제작·디지털",
  );
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.goto("/community");
  await page.getByRole("button", { name: "지역 선택", exact: true }).click();
  await page.getByLabel("시/도", { exact: true }).selectOption("울산광역시");
  await page.getByRole("button", { name: "적용하기", exact: true }).click();
  await expect(
    page.locator(".post-card").filter({ hasText: body }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "서비스 방식: 전국·온라인", exact: true })
    .click();
  await page
    .getByRole("button", { name: "제작·디지털", exact: true })
    .first()
    .click();
  await expect(
    page.locator(".post-card").filter({ hasText: body }),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "서비스 방식: 전국·온라인", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/request-categories-${width}.png`,
      fullPage: true,
    });
  }
});
