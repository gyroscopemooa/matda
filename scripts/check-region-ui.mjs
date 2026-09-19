import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  executablePath:
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
try {
  const page = await browser.newPage();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://127.0.0.1:3107/");
    await page
      .getByRole("button", { name: "커뮤니티 지역 선택", exact: true })
      .click();
    await page.getByLabel("시/도", { exact: true }).selectOption("");
    if (await page.getByLabel("시/군/구", { exact: true }).count())
      throw Error("District should be hidden");
    await page.getByLabel("시/도", { exact: true }).selectOption("울산광역시");
    if (await page.getByLabel("읍/면/동 (선택)", { exact: true }).count())
      throw Error("Town should be hidden");
    await page.getByLabel("시/군/구", { exact: true }).selectOption("남구");
    await page
      .getByLabel("읍/면/동 (선택)", { exact: true })
      .selectOption("야음동");
    await page.getByRole("button", { name: "적용하기", exact: true }).click();
    if (
      !(await page
        .getByRole("button", { name: "커뮤니티 지역 선택", exact: true })
        .textContent()
        .then((t) => t.includes("야음동")))
    )
      throw Error("Region not displayed");
    await page.screenshot({
      path: `docs/region-feed-${width}.png`,
      fullPage: true,
    });
    if (
      !(await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ))
    )
      throw Error("Overflow");
  }
  console.log(
    "Feed region UI and progressive selectors passed: mobile/desktop",
  );
} finally {
  await browser.close();
}
