import { test, expect, type APIRequestContext } from "@playwright/test";
const baseURL = process.env.PHASE2_TEST_URL || "http://127.0.0.1:3108";
async function action(
  api: APIRequestContext,
  name: string,
  input: Record<string, unknown> = {},
) {
  const response = await api.post("/api/app", {
    data: { action: name, input },
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).result;
}
async function signup(api: APIRequestContext, name: string) {
  const response = await api.post("/api/auth", {
    data: {
      action: "signup",
      name,
      role: "customer",
      email: crypto.randomUUID() + "@example.test",
      password: "phase2-test-password",
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).user;
}
for (const width of [1440, 390])
  test(`Phase 2 complete customer/provider quote flow at ${width}px`, async ({
    browser,
  }) => {
    const buyer = await browser.newContext({
      baseURL,
      viewport: { width, height: 950 },
    });
    const seller = await browser.newContext({
      baseURL,
      viewport: { width, height: 950 },
    });
    const other = await browser.newContext({ baseURL });
    try {
      await signup(buyer.request, "견적 고객");
      await signup(seller.request, "첫 업체");
      await signup(other.request, "둘째 업체");
      const bp = await buyer.newPage(),
        sp = await seller.newPage();
      await bp.goto("/");
      await expect(
        bp.getByRole("heading", { name: "내 요청에 맞는 견적을 비교해보세요" }),
      ).toBeVisible();
      await bp
        .getByRole("button", { name: "무료 견적 요청하기", exact: true })
        .click();
      await expect(bp.getByLabel("업체 견적 받기")).toHaveValue("견적 받기");
      await bp.getByRole("button", { name: "닫기", exact: true }).click();
      const post = await action(buyer.request, "post.create", {
        type: "request",
        body: "온라인 디자인 견적을 비교합니다",
        category: "제작·디지털",
        serviceMode: "online",
        quoteEnabled: true,
      });
      await sp.goto("/my");
      await sp
        .getByRole("button", { name: "업체 기능도 사용하기", exact: true })
        .click();
      await expect(
        sp.getByRole("heading", { name: "업체 관리", exact: true }),
      ).toBeVisible();
      await action(seller.request, "provider.save", {
        name: "첫 업체",
        intro: "작업 소개",
        region: "서울특별시 강남구",
        category: "제작·디지털",
        contact: "010-0000-1111",
      });
      await action(seller.request, "template.save", {
        name: "디자인 기본",
        amount: 150000,
        message: "기본 디자인",
        scope: "시안 두 개",
        duration: "3일",
        extraCost: "추가 시안 별도",
      });
      await sp.goto(`/posts/${post.id}`);
      await sp
        .getByRole("button", { name: "제안 보내기 / 수정", exact: true })
        .click();
      await expect(sp.getByLabel("견적 금액 (원)")).toHaveValue("150000");
      await expect(sp.getByLabel("예상시간 (선택)")).toHaveValue("3일");
      await sp.getByLabel("한줄 설명").fill("시안 두 개 포함 견적");
      await sp.getByRole("button", { name: "제안 보내기", exact: true }).click();
      await expect(sp.getByText("150,000원", { exact: true })).toBeVisible();
      await sp
        .getByRole("button", { name: "제안 보내기 / 수정", exact: true })
        .click();
      await expect(sp.getByLabel("한줄 설명")).toHaveValue(
        "시안 두 개 포함 견적",
      );
      await sp.getByLabel("견적 금액 (원)").fill("160000");
      await sp.getByRole("button", { name: "제안 보내기", exact: true }).click();
      await expect(sp.getByText("160,000원", { exact: true })).toBeVisible();
      await sp.locator('.quote-card input[type="file"]').setInputFiles({
        name: "견적서.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nphase2 test"),
      });
      await expect(
        sp.getByRole("button", { name: "견적서.pdf", exact: true }),
      ).toBeVisible();
      await action(other.request, "profile.enableProvider");
      await action(other.request, "provider.save", {
        name: "둘째 업체",
        intro: "다른 조건",
        region: "서울특별시 강남구",
        category: "제작·디지털",
        contact: "010-0000-2222",
      });
      await action(other.request, "quote.submit", {
        postId: post.id,
        amount: 170000,
        message: "시안 세 개",
        duration: "4일",
      });
      await bp.goto(`/posts/${post.id}`);
      await expect(bp.locator(".quote-card")).toHaveCount(2);
      await expect(
        bp.getByText("선택 업체 연락처:", { exact: false }),
      ).toHaveCount(0);
      for (const checkbox of await bp.locator(".compare-check input").all())
        await checkbox.check();
      await expect(
        bp.getByRole("table", { name: "선택한 견적 비교" }),
      ).toBeVisible();
      await bp.screenshot({
        path: `docs/phase2-compare-${width}.png`,
        fullPage: true,
      });
      expect(
        await bp.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const first = bp.locator(".quote-card").filter({
        has: bp.getByRole("heading", { name: "첫 업체", exact: true }),
      });
      await first
        .getByRole("button", { name: "상담하기", exact: true })
        .click();
      await expect(bp).toHaveURL(/\/chat\//);
      await bp
        .getByLabel("메시지", { exact: true })
        .fill("작업 일정이 궁금해요");
      await bp.getByRole("button", { name: "보내기", exact: true }).click();
      await expect(
        bp.locator(".message p").filter({ hasText: "작업 일정이 궁금해요" }),
      ).toBeVisible();
      await bp.goto(`/posts/${post.id}`);
      await bp
        .locator(".quote-card")
        .filter({
          has: bp.getByRole("heading", { name: "첫 업체", exact: true }),
        })
        .getByRole("button", { name: "이 업체 선택", exact: true })
        .click();
      await expect(
        bp.getByText("선택 업체 연락처: 010-0000-1111", { exact: true }),
      ).toBeVisible();
      await expect(
        bp.getByRole("button", { name: "후기 작성", exact: true }),
      ).toBeDisabled();
      await bp
        .getByRole("button", { name: "거래 / 작업 완료 확인", exact: true })
        .click();
      await sp.reload();
      await expect(
        sp.getByRole("button", { name: "제안 보내기 / 수정", exact: true }),
      ).toBeDisabled();
      await expect(sp.locator('.quote-card input[type="file"]')).toHaveCount(0);
      await sp
        .getByRole("button", { name: "거래 / 작업 완료 확인", exact: true })
        .click();
      await bp.reload();
      await bp.getByRole("button", { name: "후기 작성", exact: true }).click();
      await bp
        .getByRole("dialog")
        .getByLabel("후기", { exact: false })
        .fill("요청한 조건대로 작업했어요");
      await bp.getByRole("button", { name: "저장하기", exact: true }).click();
      await expect(
        bp.getByRole("heading", { name: "거래 연결 후기 · 5점" }),
      ).toBeVisible();
      await expect(
        bp.getByRole("button", { name: "후기 작성", exact: true }),
      ).toHaveCount(0);
      if (process.env.PHASE2_ONLY === "true") {
        await bp.goto("/providers");
        await expect(
          bp.getByRole("heading", { name: "더 좋은 연결을 준비하고 있어요." }),
        ).toBeVisible();
        expect((await buyer.request.get("/biz/rfqs")).status()).toBe(404);
      }
    } finally {
      await buyer.close();
      await seller.close();
      await other.close();
    }
  });
