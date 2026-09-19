import { test, expect, type APIRequestContext } from "@playwright/test";
async function signup(api: APIRequestContext, role = "customer") {
  const response = await api.post("/api/auth", {
    data: {
      action: "signup",
      name: "품질검증" + role,
      email: crypto.randomUUID() + "@example.test",
      role,
      password: "local-test-password",
    },
  });
  expect(response.ok()).toBeTruthy();
}
async function action(
  api: APIRequestContext,
  name: string,
  input: Record<string, unknown>,
) {
  const r = await api.post("/api/app", { data: { action: name, input } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()).result;
}
test("Photo resize, optional fields, persisted upload, escaped text and public metadata", async ({
  page,
}) => {
  await signup(page.request);
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "품질", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "글쓰기", exact: true }).click();
  await page
    .getByLabel("내용", { exact: false })
    .fill("사진 압축 확인 <script>window.injected=true</script>");
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2600;
    canvas.height = 2000;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#cadcf5";
    ctx.fillRect(0, 0, 2600, 2000);
    return canvas.toDataURL("image/png");
  });
  await page.locator("dialog input[type=file]").setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.from(dataUrl.split(",")[1], "base64"),
  });
  await expect(page.locator("[data-upload-id]")).toHaveCount(1);
  await page.getByLabel("시/도", { exact: true }).selectOption("서울특별시");
  await page.getByLabel("시/군/구", { exact: true }).selectOption("강남구");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page).toHaveURL(/posts\//);
  const photo = page.locator(".photo-strip img");
  await expect(photo).toBeVisible();
  expect(
    await photo.evaluate((img: HTMLImageElement) =>
      Math.max(img.naturalWidth, img.naturalHeight),
    ),
  ).toBeLessThanOrEqual(1800);
  expect(await page.evaluate(() => "injected" in window)).toBe(false);
  await page.reload();
  await expect(photo).toBeVisible();
  await expect(page).toHaveTitle(/사진 압축 확인/);
  await expect(page.locator("meta[name=description]")).toHaveAttribute(
    "content",
    /사진 압축 확인/,
  );
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    /noindex/,
  );
});
test("All public route shells at mobile, tablet and desktop; not-found page and manifest", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/community",
      "/quotes",
      "/providers",
      "/biz",
      "/biz/rfqs",
      "/biz/tenders",
      "/biz/contracts",
      "/my",
      "/chat",
      "/notifications",
    ]) {
      await page.goto(path);
      await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path + " " + width,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
  await page.goto("/not-a-real-route");
  await expect(
    page.getByRole("heading", { name: "페이지를 찾을 수 없어요" }),
  ).toBeVisible();
  await expect(page.locator("meta[name=robots]").first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
});
test("Saved template reuse, two-quote comparison and provider portfolio upload", async ({
  browser,
}) => {
  const buyer = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  const seller = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  const second = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  try {
    await signup(buyer.request);
    await signup(seller.request, "provider");
    await signup(second.request, "provider");
    const post = await action(buyer.request, "post.create", {
      body: "저장 템플릿 비교 요청",
      region: "서울 강남구",
      category: "청소",
      quoteEnabled: true,
    });
    await action(seller.request, "template.save", {
      name: "사무실 기본",
      amount: 123000,
      message: "저장한 기본 견적",
      scope: "바닥 포함",
    });
    const profile = await action(seller.request, "provider.save", {
      name: "포트폴리오 검증 업체",
      intro: "소개",
      region: "서울 강남구",
      category: "청소",
      contact: "010",
    });
    const page = await seller.newPage();
    await page.goto("/posts/" + post.id);
    await page.getByRole("button", { name: "견적 보내기 / 수정" }).click();
    await page
      .getByLabel("저장한 템플릿")
      .selectOption({ label: "사무실 기본" });
    await expect(page.getByLabel("한줄 설명")).toHaveValue("저장한 기본 견적");
    await page.getByRole("button", { name: "저장하기", exact: true }).click();
    await expect(page.getByText("123,000원")).toBeVisible();
    await action(second.request, "quote.submit", {
      postId: post.id,
      amount: 150000,
      message: "두번째 견적",
    });
    const b = await buyer.newPage();
    await b.goto("/posts/" + post.id);
    const boxes = b.getByRole("checkbox");
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await expect(b.getByRole("table")).toContainText("123,000원");
    await expect(b.getByRole("table")).toContainText("150,000원");
    await page.goto("/providers/" + profile.id);
    const png = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      c.getContext("2d")!.fillRect(0, 0, 64, 64);
      return c.toDataURL("image/png").split(",")[1];
    });
    await page.locator("input[type=file]").setInputFiles({
      name: "portfolio.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
    await expect(page.locator(".photo-strip img")).toBeVisible();
    await page.reload();
    await expect(page.locator(".photo-strip img")).toBeVisible();
  } finally {
    await buyer.close();
    await seller.close();
    await second.close();
  }
});
