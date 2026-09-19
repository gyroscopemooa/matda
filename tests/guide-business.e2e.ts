import { test, expect } from "@playwright/test";
import { fixtureUpdate } from "./fixtures";

test("Guide editor requires review and sends edited content for publication", async ({
  page,
}) => {
  const email = crypto.randomUUID() + "@example.test";
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "가이드관리",
      email,
      password: "guide-admin-test",
    },
  });
  await fixtureUpdate((db) => {
    db.users.find((u) => u.email === email)!.role = "admin";
  });
  const article = {
    slug: "daily-test",
    generation_day: "2026-09-20",
    status: "draft",
    content: {
      title: "테스트 가이드",
      category: "기타",
      intro: "실용적인 설명",
      sections: [
        { heading: "준비", body: "자료 정리" },
        { heading: "질문", body: "작업 범위 질문" },
      ],
      checks: ["범위", "일정", "조건"],
      template: "필요한 작업:",
      sources: [],
      reviewNotes: "사실 확인",
    },
  };
  let published = false;
  await page.route("**/api/guides/admin", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.reviewed).toBe(true);
      expect(body.content.title).toBe("검수한 가이드");
      published = body.status === "published";
    }
    await route.fulfill({ json: { articles: [article], runs: [] } });
  });
  await page.goto("/admin");
  const editor = page.locator(".guide-admin");
  await editor.getByRole("button", { name: /테스트 가이드/ }).click();
  await expect(
    editor.getByRole("button", { name: "검수 후 발행" }),
  ).toBeDisabled();
  await editor.getByLabel("제목", { exact: true }).fill("검수한 가이드");
  await editor.getByRole("checkbox").check();
  await editor.getByRole("button", { name: "검수 후 발행" }).click();
  await expect(editor.getByRole("status")).toHaveText("처리했습니다.");
  expect(published).toBe(true);
});
test("Guides render without JavaScript and business introductions stay out of default feed", async ({
  browser,
  page,
}) => {
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const reader = await nojs.newPage();
  await reader.goto("http://127.0.0.1:3108/guides/cleaning-request");
  await expect(
    reader.getByRole("heading", {
      name: "입주청소 요청 전, 작업 범위를 먼저 정리해요",
    }),
  ).toBeVisible();
  await nojs.close();
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "사업장담당",
      email: crypto.randomUUID() + "@example.test",
      password: "test-business-pass",
    },
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/community");
  await expect(
    page.getByRole("link", { name: "사업장담당 마이페이지" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "글쓰기", exact: true }).click();
  await page.getByLabel("이야기 영역").selectOption("business");
  await page
    .getByRole("combobox", { name: "글 종류", exact: true })
    .selectOption("업체 소개");
  await page
    .getByLabel("카테고리", { exact: false })
    .selectOption("시설·건물관리");
  const title = "시설관리업체 소개 " + Date.now();
  await page.getByLabel("제목 (선택)").fill(title);
  await page
    .getByLabel("내용", { exact: false })
    .fill("회사명: 테스트 / 업무: 시설 관리 / 서비스 지역: 서울");
  await page.getByLabel("시/도", { exact: true }).selectOption("서울특별시");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page).toHaveURL(/posts\//);
  await expect(page.getByText("업체 소개", { exact: true })).toBeVisible();
  await page.goto("/community");
  await expect(page.locator(".skeleton")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  await page.getByRole("button", { name: "사업자·업체", exact: true }).click();
  await page.getByRole("button", { name: "업체 소개", exact: true }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
