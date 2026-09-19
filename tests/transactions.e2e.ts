import { fixtureUpdate } from "./fixtures";
import { test, expect, type APIRequestContext } from "@playwright/test";
async function signup(api: APIRequestContext, name: string, role = "customer") {
  const response = await api.post("/api/auth", {
    data: {
      action: "signup",
      name,
      role,
      email: `${role}-${crypto.randomUUID()}@example.test`,
      password: "local-test-password",
    },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).user;
}
async function action(
  api: APIRequestContext,
  name: string,
  input: Record<string, unknown>,
) {
  const response = await api.post("/api/app", {
    data: { action: name, input },
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).result;
}
async function rows(api: APIRequestContext) {
  const response = await api.get("/api/app");
  expect(response.ok()).toBeTruthy();
  return (await response.json()).rows as Record<string, any>[];
}
test("Phase 1–4: two-account photo/chat/quote/trade/review/provider/BIZ regression", async ({
  browser,
}) => {
  const buyer = await browser.newContext({
    baseURL: "http://127.0.0.1:3108",
    viewport: { width: 1440, height: 1000 },
  });
  const seller = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  const stranger = await browser.newContext({
    baseURL: "http://127.0.0.1:3108",
  });
  try {
    await signup(buyer.request, "기업 담당자");
    await signup(seller.request, "맑은청소", "provider");
    await signup(stranger.request, "다른 업체", "provider");
    const photo = await buyer.request.post("/api/media", {
      multipart: {
        visibility: "public",
        file: {
          name: "pixel.png",
          mimeType: "image/png",
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aYd0AAAAASUVORK5CYII=",
            "base64",
          ),
        },
      },
    });
    expect(photo.ok()).toBeTruthy();
    const media = (await photo.json()).media;
    const post = await action(buyer.request, "post.create", {
      body: "사무실 입주청소 견적 요청",
      region: "서울 강남구",
      category: "청소",
      quoteEnabled: true,
      images: [media.id],
    });
    const profile = await action(seller.request, "provider.save", {
      name: "맑은청소",
      intro: "꼼꼼한 사무실 청소",
      region: "서울 강남구",
      category: "청소",
      contact: "010-1234-0000",
      portfolio: "소규모 사무실 청소 사례",
    });
    await action(seller.request, "verification.request", {
      note: "사업자등록증 확인 요청",
    });
    expect(
      (await rows(buyer.request)).find((r) => r.id === profile.id)?.contact,
    ).toBeUndefined();
    const chat = await action(seller.request, "conversation.create", {
      targetId: post.id,
    });
    await action(seller.request, "message.create", {
      conversationId: chat.id,
      body: "일정 협의 가능합니다.",
    });
    expect(
      (await rows(stranger.request)).some((r) => r.conversationId === chat.id),
    ).toBe(false);
    const quote = await action(seller.request, "quote.submit", {
      postId: post.id,
      amount: 240000,
      message: "창문과 바닥 포함",
      scope: "실내 전체",
      duration: "4시간",
    });
    expect((await rows(stranger.request)).some((r) => r.id === quote.id)).toBe(
      false,
    );
    const page = await buyer.newPage();
    await page.goto("/posts/" + post.id);
    await expect(page.getByText("240,000원")).toBeVisible();
    await expect(page.locator(".photo-strip img")).toBeVisible();
    await page
      .getByRole("button", { name: "이 업체 선택", exact: true })
      .click();
    await expect(page.getByText("선택한 업체", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "거래 / 작업 완료 확인" }).click();
    await action(seller.request, "trade.confirm", {
      id: post.id,
      confirmed: true,
    });
    await action(buyer.request, "review.create", {
      id: post.id,
      rating: 5,
      body: "꼼꼼하게 작업했어요.",
    });
    expect(
      (await rows(buyer.request)).find((r) => r.id === profile.id)?.contact,
    ).toBe("010-1234-0000");
    await page.goto("/chat/" + chat.id);
    await expect(
      page.getByText("일정 협의 가능합니다.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("메시지", { exact: true }).fill("감사합니다.");
    await page.getByRole("button", { name: "보내기", exact: true }).click();
    await expect(page.getByText("감사합니다.", { exact: true })).toBeVisible();
    const org = await action(buyer.request, "organization.create", {
      name: "테스트 기업",
    });
    await action(buyer.request, "post.create", {
      body: "전기안전관리 대행업체 구합니다",
      region: "서울 강남구",
      category: "전기·에너지",
      audience: "business",
      orgId: org.id,
      quoteEnabled: true,
    });
    await page.goto("/biz");
    await expect(
      page.getByRole("heading", { name: "전기안전관리 대행업체 구합니다" }),
    ).toBeVisible();
    await page.screenshot({ path: "docs/desktop-biz.png", fullPage: true });
    await page.goto("/community");
    await expect(
      page.getByRole("heading", { name: "사무실 입주청소 견적 요청" }),
    ).toBeVisible();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/providers");
    await expect(page.getByRole("heading", { name: "맑은청소" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await buyer.close();
    await seller.close();
    await stranger.close();
  }
});
test("Phase 5/6: RFQ private documents, contract D-day and sealed bidding UI", async ({
  browser,
}) => {
  const buyer = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  const seller = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  const stranger = await browser.newContext({
    baseURL: "http://127.0.0.1:3108",
  });
  try {
    await signup(buyer.request, "발주 담당자");
    await signup(seller.request, "시설 전문업체", "provider");
    await signup(stranger.request, "비참여 업체", "provider");
    const org = await action(buyer.request, "organization.create", {
      name: "RFQ 기업",
    });
    const rfq = await action(buyer.request, "rfq.create", {
      orgId: org.id,
      title: "전기안전관리 RFQ",
      body: "정기점검 및 보고서",
      region: "서울 강남구",
      category: "전기·에너지",
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });
    const proposal = await action(seller.request, "proposal.submit", {
      rfqId: rfq.id,
      amount: 600000,
      body: "월 1회 점검",
      duration: "1년",
    });
    const upload = await seller.request.post("/api/media", {
      multipart: {
        visibility: "private",
        targetId: proposal.id,
        file: {
          name: "quotation.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4\nlocal quotation"),
        },
      },
    });
    expect(upload.ok()).toBeTruthy();
    const media = (await upload.json()).media;
    const publicLeak = await seller.request.post("/api/media", {
      multipart: {
        visibility: "public",
        targetId: proposal.id,
        file: {
          name: "private.png",
          mimeType: "image/png",
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aYd0AAAAASUVORK5CYII=",
            "base64",
          ),
        },
      },
    });
    expect(publicLeak.status()).toBe(403);
    expect(
      (await stranger.request.get("/api/media?id=" + media.id)).status(),
    ).toBe(403);
    const url = (
      await (await buyer.request.get("/api/media?id=" + media.id)).json()
    ).url;
    expect(url).toContain("signature=");
    expect((await buyer.request.get(url)).status()).toBe(200);
    expect((await stranger.request.get(url)).status()).toBe(403);
    expect(
      (
        await buyer.request.get(url.replace(/expires=\d+/, "expires=1"))
      ).status(),
    ).toBe(403);
    const workplace = await action(buyer.request, "workplace.create", {
      orgId: org.id,
      name: "강남 사업장",
      region: "서울 강남구",
    });
    await action(buyer.request, "contract.create", {
      orgId: org.id,
      workplaceId: workplace.id,
      name: "전기안전관리 연간 계약",
      providerName: "시설 전문업체",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 20 * 86400000).toISOString(),
    });
    expect(
      (await rows(stranger.request)).some(
        (r) => r.kind === "contract" && r.orgId === org.id,
      ),
    ).toBe(false);
    const page = await buyer.newPage();
    await page.goto("/biz/rfqs/" + rfq.id);
    await expect(page.getByText("600,000원")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "quotation.pdf" }),
    ).toBeVisible();
    await page.goto("/biz/contracts");
    await expect(page.getByText("D-20", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/contracts.png", fullPage: true });
    const tender = await action(buyer.request, "tender.create", {
      orgId: org.id,
      title: "시설관리 공개 제안입찰",
      body: "월간 시설관리",
      category: "시설·건물관리",
      region: "서울 강남구",
      eligibility: "관련 등록업체",
      evaluation: "가격과 실적 평가",
      startAt: new Date(Date.now() - 1000).toISOString(),
      deadline: new Date(Date.now() + 86400000).toISOString(),
    });
    await action(buyer.request, "tender.publish", { id: tender.id });
    const bid = await action(seller.request, "bid.submit", {
      tenderId: tender.id,
      amount: 1200000,
      body: "봉인 제안",
    });
    expect((await rows(buyer.request)).some((r) => r.id === bid.id)).toBe(
      false,
    );
    await page.goto("/biz/tenders/" + tender.id);
    await expect(page.getByText("확인할 수 있는 투찰이 없어요")).toBeVisible();
    await page
      .getByRole("button", { name: "마감 후 개찰", exact: true })
      .click();
    await expect(
      page.getByRole("status").getByText("마감 후에만 개찰할 수 있습니다."),
    ).toBeVisible();
    await fixtureUpdate((db) => {
      const t = db.rows.find((r) => r.id === tender.id)!;
      t.deadline = new Date(Date.now() - 1000).toISOString();
    });
    await page
      .getByRole("button", { name: "마감 후 개찰", exact: true })
      .click();
    await expect(page.getByText("1,200,000원")).toBeVisible();
    await page
      .getByRole("button", { name: "평가 후 선정", exact: true })
      .click();
    await page
      .getByLabel("평가 및 선정 사유")
      .fill("실적 및 조건을 종합 평가했습니다.");
    await page.getByRole("button", { name: "저장하기", exact: true }).click();
    await expect(
      page.locator(".badge").filter({ hasText: "awarded" }),
    ).toBeVisible();
    await page.setViewportSize({ width: 360, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: "docs/mobile-tender.png", fullPage: true });
  } finally {
    await buyer.close();
    await seller.close();
    await stranger.close();
  }
});
test("Error, loading, guest, IDOR and unsafe file protections", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post("/api/app", {
        data: { action: "organization.create", input: { name: "비로그인" } },
      })
    ).status(),
  ).toBe(401);
  await page.route("**/api/app", async (route) => {
    await new Promise((r) => setTimeout(r, 300));
    await route.fulfill({ status: 500, json: { error: "테스트 연결 오류" } });
  });
  await page.goto("/");
  await expect(page.getByLabel("불러오는 중")).toBeVisible();
  await expect(page.locator("main [role=alert]")).toContainText(
    "테스트 연결 오류",
  );
  await page.unroute("**/api/app");
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "가까운 이웃과, 더 나은 일상" }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByText("접근 권한이 없습니다", { exact: true }),
  ).toBeVisible();
  await signup(request, "파일 테스트");
  const bad = await request.post("/api/media", {
    multipart: {
      visibility: "public",
      file: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from("<script>alert(1)</script>"),
      },
    },
  });
  expect(bad.status()).toBe(400);
  const exe = await request.post("/api/media", {
    multipart: {
      visibility: "private",
      file: {
        name: "bad.exe",
        mimeType: "application/octet-stream",
        buffer: Buffer.from("MZ"),
      },
    },
  });
  expect(exe.status()).toBe(400);
});

test("Phase 7: administrator report/verification review, account restriction and analytics UI", async ({
  browser,
}) => {
  const admin = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  const seller = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  try {
    const a = await signup(admin.request, "운영자");
    await signup(seller.request, "확인대기업체", "provider");
    await fixtureUpdate((db) => {
      db.users.find((u) => u.id === a.id)!.role = "admin";
    });
    const profile = await action(seller.request, "provider.save", {
      name: "확인대기업체",
      intro: "작업 소개",
      region: "서울 강남구",
      category: "청소",
      contact: "010",
    });
    const verification = await action(seller.request, "verification.request", {
      note: "사업자 자료 확인 요청",
    });
    const post = await action(seller.request, "post.create", {
      body: "운영 테스트 게시글",
      region: "서울 강남구",
      category: "청소",
    });
    const report = await action(admin.request, "report.create", {
      targetId: post.id,
      reason: "운영 신고 테스트",
    });
    const page = await admin.newPage();
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "운영 관리", exact: true }),
    ).toBeVisible();
    await page
      .locator(`[data-entity-id="${verification.id}"]`)
      .getByRole("button", { name: "사업자 확인", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await rows(seller.request)).find((r) => r.id === profile.id)
            ?.verification,
      )
      .toBe("verified");
    await page
      .locator(`[data-entity-id="${report.id}"]`)
      .getByRole("button", { name: "글 숨김", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await rows(seller.request)).find((r) => r.id === post.id)?.status,
      )
      .toBe("hidden");
    await page
      .locator(`[data-entity-id="${report.id}"]`)
      .getByRole("button", { name: "신고 처리완료", exact: true })
      .click();
    await page.getByLabel("회원 검색").fill("확인대기업체");
    await page.getByRole("button", { name: "이용 제한", exact: true }).click();
    expect(
      (
        await seller.request.post("/api/app", {
          data: {
            action: "post.create",
            input: { body: "차단", region: "서울 강남구", category: "청소" },
          },
        })
      ).status(),
    ).toBe(401);
    await page.screenshot({ path: "docs/admin.png", fullPage: true });
  } finally {
    await admin.close();
    await seller.close();
  }
});
