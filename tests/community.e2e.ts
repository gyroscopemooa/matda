import { test, expect } from "@playwright/test";
test("Phase 0: desktop/mobile shell, empty search, guest and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "필요한 일이 있나요? 일단 올려죠." }),
  ).toBeVisible();
  await expect
    .poll(() => page.locator(".post-card").count())
    .toBeGreaterThanOrEqual(5);
  await page.screenshot({ path: "docs/desktop-home.png", fullPage: true });
  await page
    .getByRole("textbox", { name: "검색", exact: true })
    .fill("존재하지않는검색어");
  await expect(page.getByText("아직 이야기가 없어요")).toBeVisible();
  await page.getByRole("button", { name: "검색 지우기" }).click();
  await page.getByRole("button", { name: "글쓰기", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(
    page.getByRole("navigation", { name: "모바일 메뉴" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/mobile-home.png", fullPage: true });
  await page.reload();
  await expect
    .poll(() => page.locator(".post-card").count())
    .toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});
test("Phase 1: signup, minimal post, comment, edit, MY and persistent refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.getByRole("button", { name: "처음이신가요? 회원가입" }).click();
  await page.getByLabel("닉네임", { exact: false }).fill("테스트 이웃");
  await page.getByLabel("이메일").fill(`neighbor-${Date.now()}@example.test`);
  await page.getByLabel("비밀번호").fill("local-test-password");
  await page.getByRole("button", { name: "가입하기", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "글쓰기·요청" }).click();
  await page
    .getByLabel("내용", { exact: false })
    .fill("테스트 이웃의 작은 도움 요청");
  await page.getByLabel("시/도", { exact: true }).selectOption("서울특별시");
  await page.getByLabel("시/군/구", { exact: true }).selectOption("강남구");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page).toHaveURL(/posts\//);
  await expect(
    page.getByRole("heading", { name: "테스트 이웃의 작은 도움 요청" }),
  ).toBeVisible();
  await page.getByLabel("댓글 내용").fill("추가 설명을 남깁니다");
  await page.getByRole("button", { name: "등록", exact: true }).click();
  await expect(
    page.getByText("추가 설명을 남깁니다", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("추가 설명을 남깁니다", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByLabel("제목 (선택)").fill("수정한 도움 요청");
  await page.getByRole("button", { name: "그냥 등록" }).click();
  await expect(
    page.getByRole("heading", { name: "수정한 도움 요청" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "MY", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "테스트 이웃님" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "수정한 도움 요청" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
