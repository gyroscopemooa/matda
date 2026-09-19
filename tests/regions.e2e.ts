import { test, expect } from "@playwright/test";
test("Desktop province-wide posts, optional district/town and full-ratio detail photos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "넓은지역이웃",
      email: crypto.randomUUID() + "@example.test",
      password: "region-test-password",
    },
  });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "넓은", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "글쓰기", exact: true })
    .first()
    .click();
  await page
    .getByLabel("내용", { exact: false })
    .fill("울산 전체 이웃에게 물어볼게요. 사진 비율 확인");
  await page
    .getByLabel("제목 (선택)")
    .fill(
      "울산 전체 이웃에게 함께 물어보고 싶은 이야기를 나누어요 "
        .repeat(4)
        .slice(0, 110),
    );
  await page.getByLabel("시/도", { exact: true }).selectOption("울산광역시");
  await expect(page.getByLabel("시/군/구", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("시/군/구", { exact: true }).locator("option:checked"),
  ).toHaveText("울산광역시 전체");
  await expect(page.getByLabel("읍/면/동 (선택)", { exact: true })).toHaveCount(
    0,
  );
  const images = await page.evaluate(() =>
    [
      [960, 540],
      [360, 640],
    ].map(([width, height]) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#abccee";
      ctx.fillRect(0, 0, width, height);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
  );
  for (const [index, image] of images.entries()) {
    await page.locator("dialog input[type=file]").setInputFiles({
      name: `ratio-${index}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
    await expect(page.locator("[data-upload-id]")).toHaveCount(index + 1);
  }
  await expect(page.locator("[data-upload-id]")).toHaveCount(2);
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page).toHaveURL(/posts\//);
  await expect(page.locator(".detail-region")).toHaveText("울산광역시");
  await expect(page.locator(".detail-author")).toContainText("넓은지역이웃");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const photos = page.locator(".post-gallery img");
    await expect(photos).toHaveCount(2);
    for (const photo of await photos.all()) {
      await expect
        .poll(() =>
          photo.evaluate((image: HTMLImageElement) => image.naturalWidth),
        )
        .toBeGreaterThan(0);
      const sizes = await photo.evaluate((image: HTMLImageElement) => ({
        w: image.width,
        h: image.height,
        nw: image.naturalWidth,
        nh: image.naturalHeight,
      }));
      expect(sizes.w).toBeGreaterThan(width === 1440 ? 600 : 250);
      expect(Math.abs(sizes.w / sizes.h - sizes.nw / sizes.nh)).toBeLessThan(
        0.01,
      );
    }
    const title = await page.locator(".detail-title").boundingBox();
    const titleHeight = await page
      .locator(".detail-title")
      .evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        line: parseFloat(getComputedStyle(el).lineHeight),
      }));
    expect(titleHeight.height).toBeLessThanOrEqual(titleHeight.line * 2 + 1);
    const gallery = await page.locator(".post-gallery").boundingBox();
    const body = await page.locator(".detail > .body-text").boundingBox();
    expect(title!.y).toBeLessThan(gallery!.y);
    expect(gallery!.y + gallery!.height).toBeLessThan(body!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/post-detail-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await expect(page.getByLabel("시/군/구", { exact: true })).toHaveValue("");
  await page.getByLabel("시/군/구", { exact: true }).selectOption("남구");
  await expect(
    page
      .getByLabel("읍/면/동 (선택)", { exact: true })
      .locator("option:checked"),
  ).toHaveText("남구 전체");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.locator(".detail-region")).toHaveText("울산광역시 남구");
  const postId = page.url().split("/").pop();
  await page.goto("/community");
  const card = page
    .locator(".post-card")
    .filter({ has: page.locator(`a.post-link[href="/posts/${postId}"]`) });
  await expect(card.locator(".feed-cover img")).toHaveCount(1);
  await expect(card.locator(".feed-thumbnails img")).toHaveCount(1);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const heading = await card
      .locator("h3")
      .evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        line: parseFloat(getComputedStyle(el).lineHeight),
      }));
    expect(heading.height).toBeLessThanOrEqual(heading.line * 2 + 1);
    const text = await card.locator(".post-link").boundingBox(),
      photo = await card.locator(".feed-cover").boundingBox(),
      thumb = await card.locator(".feed-thumbnails").boundingBox();
    expect(photo!.x).toBeGreaterThan(text!.x + text!.width);
    expect(thumb!.y).toBeGreaterThanOrEqual(photo!.y + photo!.height);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await card.screenshot({ path: `docs/post-card-${width}.png` });
  }
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    card.locator(".feed-cover").click(),
  ]);
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toContain("/api/media?id=");
  await popup.close();
});
test("Region selection: post, category intersection, persistence and dependent reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "지역 선택", exact: true }).click();
  await page.getByLabel("시/도", { exact: true }).selectOption("울산광역시");
  await page.getByLabel("시/군/구", { exact: true }).selectOption("남구");
  await page
    .getByLabel("읍/면/동 (선택)", { exact: true })
    .selectOption("야음동");
  await page.getByRole("button", { name: "적용하기", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "지역 선택", exact: true }),
  ).toContainText("울산광역시 남구 야음동");
  const email = `region-${Date.now()}@example.test`;
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      name: "지역테스트",
      email,
      password: "test-region-pass",
    },
    headers: { origin: "http://127.0.0.1:3108" },
  });
  await page.reload();
  await page.getByText("지역", { exact: true }).first().waitFor();
  await page
    .getByRole("button", { name: "글쓰기", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("읍/면/동 (선택)", { exact: true })).toHaveValue(
    "야음동",
  );
  await page
    .getByLabel("내용", { exact: false })
    .fill("야음동 동네 도움 요청 지역 검증");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(
    page.getByText("야음동 동네 도움 요청 지역 검증").first(),
  ).toBeVisible();
  await page.goto("/community");
  await expect(
    page.getByText("야음동 동네 도움 요청 지역 검증").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "이사·운송", exact: true })
    .first()
    .click();
  await expect(page.getByText("야음동 동네 도움 요청 지역 검증")).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "이사·운송", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "지역 선택", exact: true }).click();
  await page
    .getByLabel("읍/면/동 (선택)", { exact: true })
    .selectOption("삼산동");
  await page.getByRole("button", { name: "적용하기", exact: true }).click();
  await expect(page.getByText("야음동 동네 도움 요청 지역 검증")).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "지역 선택", exact: true }).click();
  await page.getByLabel("시/도", { exact: true }).selectOption("서울특별시");
  await expect(page.getByLabel("시/군/구", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("읍/면/동 (선택)", { exact: true })).toHaveCount(
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "docs/region-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const bad = await page.request.post("/api/app", {
    data: {
      action: "post.create",
      input: {
        body: "잘못된 조합",
        region: "울산 남구 역삼동",
        category: "청소",
      },
    },
    headers: { origin: "http://127.0.0.1:3108" },
  });
  expect(bad.status()).toBe(400);
});
