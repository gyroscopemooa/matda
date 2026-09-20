import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  koreanDay,
  validateGuide,
  canAutoPublish,
} from "../src/lib/guide-content";
import { act } from "../src/lib/domain";
import { generateDailyGuide } from "../src/lib/guide-server";
import type { Database, User, Row } from "../src/lib/types";

test("AI pipeline stores a validated draft, skips duplicates, and records provider failure", async () => {
  const fetchBefore = globalThis.fetch;
  const before = { ...process.env };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://guide-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.OPENAI_API_KEY = "test-ai-key";
  let claimed = true,
    fail = false,
    calls = 0,
    saved: unknown = null,
    recorded = false;
  const content = {
    title: "작업 요청 자료 준비",
    category: "기타",
    intro: "작업 전에 필요한 정보를 정리해요.",
    sections: [
      { heading: "자료 준비", body: "작업 대상을 정리해요." },
      { heading: "질문 준비", body: "작업 범위를 물어보세요." },
    ],
    checks: ["범위 확인", "일정 확인", "자료 준비"],
    template: "필요한 작업:",
    sources: [],
    reviewNotes: "담당자 검수 필요",
  };
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init),
      url = new URL(req.url);
    if (url.hostname === "api.openai.com") {
      calls++;
      return fail
        ? Response.json({ error: "private provider detail" }, { status: 429 })
        : Response.json({
            status: "completed",
            output: [
              {
                content: [
                  { type: "output_text", text: JSON.stringify(content) },
                ],
              },
            ],
          });
    }
    if (url.pathname.endsWith("/claim_guide_day"))
      return Response.json(claimed);
    if (url.pathname.endsWith("/finish_guide_day_v2")) {
      saved = await req.json();
      return Response.json("draft");
    }
    if (url.pathname.endsWith("/guide_generation_runs")) {
      recorded = true;
      return new Response(null, { status: 204 });
    }
    if (url.pathname.endsWith("/guide_automation_settings"))
      return Response.json({ mode: "manual" });
    if (url.pathname.endsWith("/guide_articles")) return Response.json([]);
    throw new Error("Unexpected outbound request");
  };
  try {
    assert.equal((await generateDailyGuide()).status, "draft");
    assert.ok(saved);
    assert.equal((await generateDailyGuide(true)).status, "disabled");
    assert.equal(calls, 1);
    assert.equal(canAutoPublish({ ...content, category: "청소·관리" }), true);
    assert.equal(
      canAutoPublish({
        ...content,
        category: "청소·관리",
        intro: "계약금 30% 지급",
      }),
      false,
    );
    claimed = false;
    assert.equal((await generateDailyGuide()).status, "skipped");
    assert.equal(calls, 1);
    claimed = true;
    fail = true;
    await assert.rejects(generateDailyGuide(), /openai-http-429/);
    assert.equal(recorded, true);
  } finally {
    globalThis.fetch = fetchBefore;
    for (const key of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
    ]) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
});

test("Korean daily boundary and invalid guide output", () => {
  assert.equal(koreanDay(new Date("2026-09-20T14:59:59Z")), "2026-09-20");
  assert.equal(koreanDay(new Date("2026-09-20T15:00:00Z")), "2026-09-21");
  assert.throws(() => validateGuide({ title: "bad" }));
});
test("Business community does not require organization or grant RFQ rights", () => {
  const u: User = {
    id: "u",
    name: "사용자",
    email: "test@example.test",
    password: "",
    role: "customer",
    region: "서울특별시",
    createdAt: new Date().toISOString(),
  };
  const db: Database = { users: [u], rows: [], sessions: [] };
  const p = act(db, u, "post.create", {
    type: "request",
    body: "승강기 점검 업체 문의",
    category: "시설·건물관리",
    communitySector: "business",
    region: "서울특별시",
  });
  assert.equal((p as Row).audience, "consumer");
  assert.equal((p as Row).communitySector, "business");
  assert.equal((p as Row).orgId, null);
  assert.throws(() =>
    act(db, u, "post.create", {
      type: "free",
      body: "홍보",
      communityPurpose: "introduction",
      region: "서울특별시",
    }),
  );
});
test("Guide SQL: claims, bounded retry, draft isolation and admin publication", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create table profiles(id uuid primary key);create table categories(id text primary key,domain text,name text,sort int,active boolean default true);create table posts(post_type text);create function community_admin() returns boolean language sql as $$select current_setting('test.admin',true)='true'$$;create function community_active() returns boolean language sql as $$select true$$;grant usage on schema public to anon,authenticated,service_role;`,
    );
    const sql = await readFile(
      "supabase/migrations/0011_guides_business.sql",
      "utf8",
    );
    await db.exec(sql);
    await db.exec(sql);
    const token = "11111111-1111-4111-8111-111111111111";
    const claim = async (day: string) =>
      (
        await db.query<{ ok: boolean }>(
          `select claim_guide_day('${day}','${token}') ok`,
        )
      ).rows[0].ok;
    await db.exec("set role service_role");
    assert.equal(await claim("2026-09-20"), true);
    assert.equal(await claim("2026-09-20"), false);
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          `select finish_guide_day('2026-09-20','${token}','{"title":"draft"}') ok`,
        )
      ).rows[0].ok,
      true,
    );
    assert.equal(await claim("2026-09-20"), false);
    for (let i = 0; i < 3; i++) {
      assert.equal(await claim("2026-09-21"), true);
      await db.exec(
        "update guide_generation_runs set status='failed' where day='2026-09-21'",
      );
    }
    assert.equal(await claim("2026-09-21"), false);
    await db.exec("reset role;set role anon");
    assert.equal(
      (await db.query("select * from guide_articles")).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(`select claim_guide_day('2026-09-22','${token}')`),
      /permission denied/,
    );
    await db.exec(
      "reset role;set role authenticated;select set_config('test.admin','false',false)",
    );
    assert.equal(
      (await db.query("update guide_articles set status='held' returning slug"))
        .rows.length,
      0,
    );
    await db.exec(
      `reset role;insert into profiles values('${token}');set role authenticated;select set_config('test.admin','true',false)`,
    );
    await assert.rejects(
      db.exec("update guide_articles set status='published'"),
      /check constraint/,
    );
    await db.exec(
      `update guide_articles set status='published',reviewed=true,reviewed_by='${token}',published_at=now()`,
    );
    await db.exec("reset role;set role anon");
    assert.equal(
      (await db.query("select * from guide_articles")).rows.length,
      1,
    );
    await db.exec("reset role");
    const modes = await readFile(
      "supabase/migrations/0013_guide_automation_modes.sql",
      "utf8",
    );
    await db.exec(modes);
    await db.exec(modes);
    await db.exec(
      "set role authenticated;select set_config('test.admin','false',false)",
    );
    assert.equal(
      (
        await db.query(
          "update guide_automation_settings set mode='auto' returning id",
        )
      ).rows.length,
      0,
    );
    await db.exec(
      "reset role;update guide_automation_settings set mode='auto';set role service_role",
    );
    for (const [day, scheduled, eligible, expected] of [
      ["2026-09-22", true, true, "published"],
      ["2026-09-23", false, true, "draft"],
      ["2026-09-24", true, false, "draft"],
    ] as const) {
      assert.equal(await claim(day), true);
      assert.equal(
        (
          await db.query<{ state: string }>(
            `select finish_guide_day_v2('${day}','${token}','{"title":"test"}',${scheduled},${eligible}) state`,
          )
        ).rows[0].state,
        expected,
      );
    }
    const automated = (
      await db.query<{ reviewed: boolean; reviewed_by: string | null }>(
        "select reviewed,reviewed_by from guide_articles where generation_day='2026-09-22'",
      )
    ).rows[0];
    assert.equal(automated.reviewed, false);
    assert.equal(automated.reviewed_by, null);
    assert.equal(await claim("2026-09-25"), true);
    await db.exec(
      "reset role;update guide_automation_settings set mode='manual';set role service_role",
    );
    assert.equal(
      (
        await db.query<{ state: string }>(
          `select finish_guide_day_v2('2026-09-25','${token}','{"title":"test"}',true,true) state`,
        )
      ).rows[0].state,
      "draft",
    );
  } finally {
    await db.close();
  }
});
