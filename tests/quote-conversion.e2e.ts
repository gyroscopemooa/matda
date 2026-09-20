import { test, expect } from "@playwright/test";

test.use({ baseURL: process.env.PHASE2_TEST_URL || "http://127.0.0.1:3108" });
for (const width of [1440, 390]) {
  test(`Phase 2 request conversion preserves URL and comments at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const signup = await page.request.post("/api/auth", {
      data: {
        action: "signup",
        name: "전환테스트",
        role: "customer",
        email: `convert-${crypto.randomUUID()}@example.test`,
        password: "local-test-password",
      },
    });
    expect(signup.ok()).toBeTruthy();
    const result = await page.request.post("/api/app", {
      data: {
        action: "post.create",
        input: {
          body: "작성했던 요청을 견적으로 전환합니다",
          type: "request",
          category: "제작·디지털",
          serviceMode: "online",
          quoteEnabled: false,
        },
      },
    });
    expect(result.ok()).toBeTruthy();
    const post = (await result.json()).result;
    const comment = await page.request.post("/api/app", {
      data: {
        action: "comment.create",
        input: { postId: post.id, body: "전환 전 댓글을 보존합니다" },
      },
    });
    expect(comment.ok()).toBeTruthy();
    await page.goto(`/posts/${post.id}`);
    await page
      .getByRole("button", { name: "견적 요청으로 전환", exact: true })
      .click();
    await page
      .getByRole("button", { name: "견적 모집 시작", exact: true })
      .click();
    await expect(
      page.getByText("견적 모집 시작에 동의해주세요.", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("기존 글로 견적 모집을 시작할까요?")
      .selectOption("동의하고 시작");
    await page
      .getByRole("button", { name: "견적 모집 시작", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/posts/${post.id}$`));
    await expect(
      page.getByRole("heading", { name: /도착한 견적/ }),
    ).toBeVisible();
    await expect(
      page.getByText("전환 전 댓글을 보존합니다", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "견적 요청으로 전환", exact: true }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /도착한 견적/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
