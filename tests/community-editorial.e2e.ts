import { test, expect } from "@playwright/test";

test("manual posts retain upload/edit flow and expose safe related links in server HTML", async ({
  page,
  browser,
}) => {
  const signup = await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "수동 운영",
      email: `${crypto.randomUUID()}@example.test`,
      password: "local-test-password",
    },
  });
  expect(signup.ok()).toBeTruthy();
  const upload = await page.request.post("/api/media", {
    multipart: {
      visibility: "public",
      file: {
        name: "photo.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=",
          "base64",
        ),
      },
    },
  });
  expect(upload.ok()).toBeTruthy();
  const imageId = (await upload.json()).media.id;
  const create = async (title: string, body: string) => {
    const response = await page.request.post("/api/app", {
      data: {
        action: "post.create",
        input: {
          title,
          body,
          type: "question",
          category: "청소·관리",
          region: "서울 강남구",
          images: [imageId],
        },
      },
    });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).result.id as string;
  };
  const first = await create(
    "입주청소 준비 순서",
    "입주청소 전에 필요한 사진을 준비합니다.",
  );
  const second = await create(
    "입주청소 사진은 무엇을 찍나요?",
    `운영자가 정리한 입주청소 안내입니다. [준비 순서 확인](/posts/${first})`,
  );
  await page.goto(`/posts/${second}`);
  await expect(
    page.locator(".body-text").getByRole("link", { name: "준비 순서 확인" }),
  ).toHaveAttribute("href", `/posts/${first}`);
  await expect(
    page
      .getByLabel("관련 안내")
      .locator(`a[href="/posts/${first}"]`),
  ).toBeVisible();
  await expect(page.locator(".post-gallery img")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "수정", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await page.getByLabel("제목 (선택)").fill("입주청소 사진 준비 수정 안내");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "입주청소 사진 준비 수정 안내" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "입주청소 사진 준비 수정 안내" }),
  ).toBeVisible();
  const guest = await browser.newContext({ javaScriptEnabled: false });
  const guestPage = await guest.newPage();
  await guestPage.goto(`http://127.0.0.1:3108/posts/${first}`);
  await expect(guestPage.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "index, follow",
  );
  await expect(guestPage.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `http://127.0.0.1:3108/posts/${first}`,
  );
  await expect(
    guestPage.getByRole("heading", { name: "입주청소 준비 순서" }),
  ).toBeVisible();
  await expect(
    guestPage
      .getByLabel("관련 안내")
      .locator(`a[href="/posts/${second}"]`),
  ).toBeVisible();
  await expect(
    guestPage.getByRole("button", { name: "수정", exact: true }),
  ).toHaveCount(0);
  const response = await guestPage.request.get(`/posts/${second}`);
  expect(await response.text()).not.toContain("@example.test");
  const sitemap = await guestPage.request.get(
    "http://127.0.0.1:3108/sitemap.xml",
  );
  const xml = await sitemap.text();
  expect(xml).toContain(`/posts/${first}`);
  expect(xml).not.toContain("/posts/sample-");
  await guestPage.goto("http://127.0.0.1:3108/community");
  await expect(
    guestPage.locator(`.post-card a[href="/posts/${second}"]`).first(),
  ).toBeVisible();
  await guestPage.goto("http://127.0.0.1:3108/posts/sample-0");
  await expect(guestPage.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await guest.close();
});
