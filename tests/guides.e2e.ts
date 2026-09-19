import { test, expect } from "@playwright/test";
test("Guide filters, guest signup and request template preserve intent", async ({
  page,
}) => {
  await page.goto("/guides");
  await expect(
    page.getByRole("heading", { name: "해죠 가이드", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("가이드 카테고리")
    .getByRole("button", { name: "제작·디지털", exact: true })
    .click();
  await expect(page.locator(".guide-card")).toHaveCount(1);
  await page.locator(".guide-card").click();
  await expect(
    page.getByRole("heading", {
      name: "웹사이트 제작 요청, 필요한 화면부터 적어봐요",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "이 내용으로 요청 글 작성하기" })
    .click();
  await page.getByRole("button", { name: "처음이신가요? 회원가입" }).click();
  await page.getByLabel("닉네임", { exact: false }).fill("가이드독자");
  await page.getByLabel("이메일").fill(crypto.randomUUID() + "@example.test");
  await page.getByLabel("비밀번호").fill("guide-test-password");
  await page.getByRole("button", { name: "가입하기", exact: true }).click();
  await expect(page.locator('select[name="category"]')).toHaveValue(
    "제작·디지털",
  );
  await expect(
    page.getByRole("radio", { name: "전국·온라인 가능" }),
  ).toBeChecked();
  await expect(page.getByLabel("내용", { exact: false })).toHaveValue(
    /제작 목적:/,
  );
  await page
    .getByLabel("내용", { exact: false })
    .fill("가이드에서 시작한 실제 제작 요청");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page).toHaveURL(/posts\//);
  await page.goto("/guides/digital-request");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `docs/guide-${width}.png`, fullPage: true });
  }
  await page.goto("/guides/not-published");
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없어요" }),
  ).toBeVisible();
});
