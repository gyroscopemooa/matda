import { test, expect } from "@playwright/test";
import { fixtureUpdate } from "./fixtures";
test("Admin moderates posts and comments directly in public screens", async ({
  browser,
}) => {
  const admin = await browser.newContext();
  const member = await browser.newContext();
  try {
    const email = crypto.randomUUID() + "@example.test";
    for (const [ctx, mail] of [
      [admin, email],
      [member, crypto.randomUUID() + "@example.test"],
    ] as const)
      await ctx.request.post("/api/auth", {
        data: {
          action: "signup",
          name: "운영확인",
          email: mail,
          password: "admin-test-password",
        },
      });
    await fixtureUpdate((db) => {
      db.users.find((u) => u.email === email)!.role = "admin";
    });
    const post = await (
      await member.request.post("/api/app", {
        data: {
          action: "post.create",
          input: {
            type: "question",
            title: "관리자 바로 삭제 확인",
            body: "본문",
            category: "제작·디지털",
            serviceMode: "online",
          },
        },
      })
    ).json();
    await member.request.post("/api/app", {
      data: {
        action: "comment.create",
        input: { postId: post.result.id, body: "삭제 확인 댓글" },
      },
    });
    const p = await admin.newPage();
    const m = await member.newPage();
    await m.goto("/posts/" + post.result.id);
    await expect(
      m.getByRole("button", { name: "관리자 삭제", exact: true }),
    ).toHaveCount(0);
    await p.goto("/posts/" + post.result.id);
    await p
      .locator(".comment")
      .getByRole("button", { name: "관리자 삭제", exact: true })
      .click();
    await p.locator('[name="confirm"]').fill("삭제");
    await p.getByRole("button", { name: "삭제 처리", exact: true }).click();
    await expect(p.locator(".comment")).toHaveCount(0);
    await m.reload();
    await expect(m.locator(".comment")).toHaveCount(0);
    await p.goto("/community");
    await p
      .locator(".post-card")
      .filter({ hasText: "관리자 바로 삭제 확인" })
      .getByRole("button", { name: "관리자 삭제", exact: true })
      .click();
    await p.locator('[name="confirm"]').fill("삭제");
    await p.getByRole("button", { name: "삭제 처리", exact: true }).click();
    await expect(
      p.locator(".post-card").filter({ hasText: "관리자 바로 삭제 확인" }),
    ).toHaveCount(0);
  } finally {
    await admin.close();
    await member.close();
  }
});
