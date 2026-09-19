import { test, expect } from "@playwright/test";
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
