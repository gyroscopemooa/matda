import { test, expect, type APIRequestContext } from "@playwright/test";
const baseURL = process.env.PHASE2_TEST_URL || "http://127.0.0.1:3108";
async function action(
  api: APIRequestContext,
  action: string,
  input: Record<string, unknown> = {},
) {
  const r = await api.post("/api/app", { data: { action, input } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()).result;
}
for (const width of [1440, 390])
  test(`Proposal types and shared answers at ${width}px`, async ({
    browser,
  }) => {
    const buyer = await browser.newContext({
        baseURL,
        viewport: { width, height: 950 },
      }),
      seller = await browser.newContext({
        baseURL,
        viewport: { width, height: 950 },
      }),
      other = await browser.newContext({ baseURL }),
      guest = await browser.newContext({ baseURL });
    try {
      for (const c of [buyer, seller, other]) {
        const r = await c.request.post("/api/auth", {
          data: {
            action: "signup",
            name: "제안 테스트",
            email: crypto.randomUUID() + "@example.test",
            password: "proposal-test-password",
          },
        });
        expect(r.ok()).toBeTruthy();
      }
      for (const c of [seller, other])
        await action(c.request, "profile.enableProvider");
      const post = await action(buyer.request, "post.create", {
        type: "request",
        body: "디자인 요청 " + crypto.randomUUID(),
        category: "제작·디지털",
        serviceMode: "online",
        quoteEnabled: true,
      });
      const sp = await seller.newPage(),
        bp = await buyer.newPage();
      await sp.goto("/posts/" + post.id);
      await sp
        .getByRole("button", { name: "제안 보내기 / 수정", exact: true })
        .click();
      await sp.getByLabel("제안 유형").selectOption("inspection");
      await expect(sp.getByLabel("견적 금액 (원)")).toHaveCount(0);
      await sp.getByLabel("확인할 사항").fill("원본 사진 확인 필요");
      await sp.getByLabel("상담·방문 가능 일정").fill("내일 오후 온라인 상담");
      await sp.getByLabel("상담·방문비 (원").fill("0");
      await sp.getByLabel("한줄 설명").fill("사진 확인 후 최종 제안");
      await sp
        .getByRole("button", { name: "제안 보내기", exact: true })
        .click();
      await expect(sp.locator(".quote-card")).toContainText("가격 미정");
      await action(other.request, "quote.submit", {
        postId: post.id,
        proposalType: "estimate",
        amount: 200000,
        amountMax: 300000,
        priceCondition: "수정 횟수",
        message: "예상 범위",
      });
      await sp
        .getByRole("button", { name: "추가정보 요청", exact: true })
        .click();
      await sp
        .getByLabel("다른 업체도 필요한 질문")
        .fill("원본 사진이 있나요?");
      await sp
        .getByRole("dialog")
        .getByRole("button", { name: "추가정보 요청", exact: true })
        .click();
      await expect(
        sp.getByText("원본 사진이 있나요?", { exact: true }),
      ).toBeVisible();
      await bp.goto("/posts/" + post.id);
      await expect(bp.locator(".quote-card")).toHaveCount(2);
      await expect(
        bp.getByRole("button", { name: "이 업체 선택", exact: true }),
      ).toHaveCount(0);
      await bp.getByRole("button", { name: "한 번에 답변" }).click();
      await bp
        .getByLabel("참여 업체에게 공유할 답변")
        .fill("원본 사진 3장 있습니다");
      await bp.getByLabel("제안 참여 업체에게 공유").selectOption("공유 동의");
      await bp.getByRole("button", { name: "답변 공유", exact: true }).click();
      const op = await other.newPage();
      await op.goto("/posts/" + post.id);
      await expect(
        op.getByText("원본 사진 3장 있습니다", { exact: true }),
      ).toBeVisible();
      await action(other.request, "quote.question", {
        postId: post.id,
        question: "원본  사진이 있나요?",
      });
      const data = await (await other.request.get("/api/app")).json();
      expect(
        data.rows.filter(
          (r: { kind: string; postId: string }) =>
            r.kind === "quoteQuestion" && r.postId === post.id,
        ),
      ).toHaveLength(1);
      const publicData = await (await guest.request.get("/api/app")).json();
      expect(
        publicData.rows.filter(
          (r: { kind: string; postId: string }) =>
            ["quote", "quoteQuestion"].includes(r.kind) && r.postId === post.id,
        ),
      ).toHaveLength(0);
      await sp.reload();
      await sp
        .getByRole("button", { name: "최종 견적 보내기", exact: true })
        .click();
      await expect(sp.getByLabel("제안 유형")).toHaveValue("fixed");
      await sp.getByLabel("견적 금액 (원)").fill("230000");
      await sp
        .getByRole("button", { name: "제안 보내기", exact: true })
        .click();
      await bp.reload();
      await expect(
        bp.getByRole("button", { name: "이 업체 선택", exact: true }),
      ).toHaveCount(1);
      for (const box of await bp.locator(".compare-check input").all())
        await box.check();
      await expect(bp.getByRole("table")).toContainText(
        "200,000원 ~ 300,000원",
      );
      expect(
        await bp.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await bp.screenshot({
        path: `docs/proposals-${width}.png`,
        fullPage: true,
      });
    } finally {
      for (const c of [buyer, seller, other, guest]) await c.close();
    }
  });
