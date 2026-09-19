import { chromium } from "@playwright/test";
(async () => {
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const page = await browser.newPage();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:3107/");
    await page.getByText("우리 동네 이야기").first().waitFor();
    for (const path of ["/quotes", "/providers", "/biz"])
      if (await page.locator(`a[href="${path}"]`).count())
        throw Error("Future navigation exposed: " + path);
    await page.screenshot({ path: `docs/phase1-${width}.png`, fullPage: true });
  }
  await page.route("**/api/app", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.user = {
      id: "phase-check",
      name: "화면검증",
      role: "customer",
      region: "서울",
    };
    await route.fulfill({ json: body });
  });
  await page.goto("http://127.0.0.1:3107/my");
  await page.getByText("화면검증님").waitFor();
  if (
    (await page.getByText("내 기업", { exact: true }).count()) ||
    (await page.getByText("보낸 견적", { exact: true }).count())
  )
    throw Error("Future MY exposed");
  await page.goto("http://127.0.0.1:3107/");
  await page.getByText("화면", { exact: true }).first().waitFor();
  await page
    .getByRole("button", { name: "글쓰기", exact: true })
    .first()
    .click();
  if (await page.getByText("업체 견적 받기", { exact: true }).count())
    throw Error("Quote field exposed");
  await page.unroute("**/api/app");
  for (const path of ["/quotes", "/providers", "/biz", "/biz/rfqs"]) {
    await page.goto("http://127.0.0.1:3107" + path);
    if (!(await page.getByRole("heading", { name: /찾을 수/ }).count()))
      throw Error("Route exposed: " + path);
  }
  console.log("Phase 1 desktop/mobile, MY, post form and direct routes passed");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
