import { test, expect } from "@playwright/test";
test("Author opens incoming chat from bell and MY, then replies", async ({
  browser,
}) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const author = await a.newPage();
  const sender = await b.newPage();
  for (const [page, name] of [
    [author, "작성자"],
    [sender, "문의자"],
  ] as const) {
    await page.request.post("/api/auth", {
      data: {
        action: "signup",
        name,
        email: crypto.randomUUID() + "@example.test",
        password: "chat-test-password",
      },
    });
  }
  const post = await (
    await author.request.post("/api/app", {
      data: {
        action: "post.create",
        input: {
          type: "request",
          category: "제작·디지털",
          serviceMode: "online",
          title: "아주 긴 제작 요청 제목 ".repeat(15),
          body: "홈페이지 제작 문의",
        },
      },
    })
  ).json();
  const chat = await (
    await sender.request.post("/api/app", {
      data: {
        action: "conversation.create",
        input: { targetId: post.result.id },
      },
    })
  ).json();
  await sender.request.post("/api/app", {
    data: {
      action: "message.create",
      input: { conversationId: chat.result.id, body: "제작 도와드릴게요" },
    },
  });
  await sender.request.post("/api/app", {
    data: {
      action: "comment.create",
      input: { postId: post.result.id, body: "댓글 문의입니다" },
    },
  });
  await author.goto("/my");
  await author
    .getByRole("link", { name: /나의 대화/ })
    .first()
    .click();
  await expect(author).toHaveURL(/\/chat$/);
  await author.locator(".chat-item").filter({ hasText: "문의자" }).click();
  await expect(
    author.getByText("제작 도와드릴게요", { exact: true }).last(),
  ).toBeVisible();
  await author.getByLabel("메시지", { exact: true }).fill("네 반갑습니다");
  await author.getByRole("button", { name: "보내기", exact: true }).click();
  await sender.goto("/chat/" + chat.result.id);
  await expect(
    sender.getByText("네 반갑습니다", { exact: true }).last(),
  ).toBeVisible();
  await author.getByRole("button", { name: "알림", exact: true }).click();
  await expect(author.getByRole("region", { name: "최근 알림" })).toBeVisible();
  await author
    .locator(".notification-entry")
    .filter({ hasText: "새 댓글" })
    .click();
  await expect(author).toHaveURL(
    new RegExp("/posts/" + post.result.id + "#comments"),
  );
  await author.getByRole("button", { name: "알림", exact: true }).click();
  await author
    .locator(".notification-entry")
    .filter({ hasText: "새 메시지" })
    .click();
  await expect(author).toHaveURL(new RegExp("/chat/" + chat.result.id));
  for (const width of [1440, 390]) {
    await author.setViewportSize({ width, height: 900 });
    expect(
      await author.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await author.screenshot({ path: `docs/chat-fixed-${width}.png` });
  }
  await a.close();
  await b.close();
});
