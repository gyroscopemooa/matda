import { test, expect } from "@playwright/test";
test("Schedule range persists and editing to flexible clears dates", async ({
  page,
}) => {
  await page.request.post("/api/auth", {
    data: {
      action: "signup",
      email: `schedule-${Date.now()}@example.test`,
      name: "일정확인",
      password: "schedule-test-pass",
    },
    headers: { origin: "http://127.0.0.1:3108" },
  });
  await page.goto("/");
  await page.getByText("일정", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "글쓰기", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("일정 방식")).toHaveValue("flexible");
  await expect(page.locator('input[name="desiredDate"]')).toHaveCount(0);
  await page
    .getByLabel("내용", { exact: false })
    .fill("기간 지정 저장 확인 요청");
  await page.getByLabel("시/도", { exact: true }).selectOption("울산광역시");
  await page.getByLabel("시/군/구", { exact: true }).selectOption("남구");
  await page.getByLabel("일정 방식").selectOption("range");
  await page.getByLabel("시작일", { exact: true }).fill("2026-10-02");
  await page.getByLabel("종료일", { exact: true }).fill("2026-10-05");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(
    page.getByText("희망 일정: 2026-10-02 ~ 2026-10-05"),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "수정", exact: true }).click();
  await expect(page.getByLabel("일정 방식")).toHaveValue("range");
  await expect(page.getByLabel("종료일", { exact: true })).toHaveValue(
    "2026-10-05",
  );
  await page.getByLabel("일정 방식").selectOption("date");
  await expect(page.getByLabel("희망일", { exact: true })).toHaveValue(
    "2026-10-02",
  );
  await expect(page.getByLabel("종료일", { exact: true })).toHaveCount(0);
  await page.getByLabel("일정 방식").selectOption("flexible");
  await page.getByRole("button", { name: "그냥 등록", exact: true }).click();
  await expect(page.getByText("희망 일정: 협의 가능")).toBeVisible();
  await page.reload();
  await expect(page.getByText("희망 일정: 협의 가능")).toBeVisible();
});
