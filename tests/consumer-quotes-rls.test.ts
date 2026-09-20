import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createClient, type User as Identity } from "@supabase/supabase-js";
import {
  loadCommunity,
  communityAction,
  communitySnapshot,
} from "../src/lib/community-repository";

test("Phase 2 PostgreSQL: role, atomic request, quote caps/privacy, chat, private documents, selection, contacts and trade review", async () => {
  const db = new PGlite();
  const buyer = randomUUID(),
    sellers = Array.from({ length: 6 }, () => randomUUID()),
    outsider = randomUUID();
  const as = async (id: string) => {
    await db.exec("reset role;set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  };
  const rpc = async (
    operation: string,
    payload: Record<string, unknown> = {},
  ) =>
    (
      await db.query<{ result: { id: string; ok?: boolean } }>(
        "select consumer_quote_action($1,$2::jsonb) result",
        [operation, JSON.stringify(payload)],
      )
    ).rows[0].result;
  const sql = async (name: string) =>
    db.exec(await readFile(`supabase/migrations/${name}.sql`, "utf8"));
  try {
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated",
    );
    for (const name of [
      "0001_foundation",
      "0002_transactional_rpc",
      "0003_free_post_type",
      "0004_community_launch",
      "0005_community_realtime",
      "0006_request_categories",
    ])
      await sql(name);
    await db.exec(
      "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);insert into storage.buckets(id) values('community-images');create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner_id text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;alter table posts add column is_sample boolean not null default false",
    );
    for (const name of [
      "0007_supabase_storage",
      "0009_chat_close_preview",
      "0011_guides_business",
      "0015_quote_request_conversion",
      "0016_consumer_quote_workflow",
      "0017_quote_documents",
      "0018_proposals_and_shared_questions",
    ])
      await sql(name);
    for (const id of [buyer, ...sellers, outsider]) {
      await db.query("insert into auth.users values($1)", [id]);
      await db.query(
        "insert into profiles(id,display_name,region) values($1,'회원','서울특별시 강남구')",
        [id],
      );
    }
    await as(sellers[0]);
    await assert.rejects(rpc("profile.enableProvider"), /not released/);
    await db.exec(
      "reset role;update platform_settings set value='true' where key='consumer_quotes_enabled'",
    );
    for (const id of sellers) {
      await as(id);
      await rpc("profile.enableProvider");
      await rpc("provider.save", {
        name: "청소 업체",
        intro: "입주청소",
        region: "서울특별시 강남구",
        category: "청소·관리",
        contact: "010-0000-1234",
      });
    }
    await rpc("template.save", {
      name: "기본",
      amount: 100000,
      message: "기본 설명",
      scope: "실내",
      duration: "3시간",
      extraCost: "창문 협의",
    });
    await assert.rejects(
      rpc("template.save", { name: "금액 오류", amount: 1.5, message: "설명" }),
      /bigint/,
    );
    await as(buyer);
    const post = {
      id: randomUUID(),
      type: "request",
      body: "새로운 입주청소 요청",
      title: "청소 견적",
      category: "청소·관리",
      region: "전국 · 온라인",
      serviceMode: "online",
      images: [],
      schedule: { scheduleMode: "flexible" },
    };
    await rpc("post.create", post);
    await assert.rejects(
      rpc("post.create", { ...post, id: randomUUID() }),
      /Duplicate/,
    );
    const request = (
      await db.query<{ id: string }>(
        "select id from quote_requests where post_id=$1",
        [post.id],
      )
    ).rows[0].id;
    const quoteIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      await as(sellers[i]);
      quoteIds.push(
        (
          await rpc("quote.submit", {
            postId: post.id,
            amount: 100000 + i * 10000,
            message: "작업 포함",
            duration: "3시간",
          })
        ).id,
      );
    }
    await as(sellers[0]);
    assert.equal((await db.query("select * from quotes")).rows.length, 1);
    assert.equal(
      (
        await rpc("quote.submit", {
          postId: post.id,
          amount: 110000,
          message: "수정 견적",
        })
      ).id,
      quoteIds[0],
    );

    // Structured proposals keep unknown prices null, permit only final selection,
    // and share one answer only with proposal participants.
    const questionRpc = async (
      operation: string,
      payload: Record<string, unknown>,
    ) =>
      (
        await db.query<{ result: { id: string } }>(
          "select consumer_quote_question_action($1,$2::jsonb) result",
          [operation, JSON.stringify(payload)],
        )
      ).rows[0].result;
    await rpc("quote.submit", {
      postId: post.id,
      proposalType: "inspection",
      message: "사진 확인 후",
      inspectionReason: "엘리베이터 여부",
      visitSlots: "내일 오후",
      visitFee: 0,
    });
    assert.equal(
      (
        await db.query<{ amount: unknown }>(
          "select amount from quotes where id=$1",
          [quoteIds[0]],
        )
      ).rows[0].amount,
      null,
    );
    await as(buyer);
    await assert.rejects(
      rpc("quote.select", { id: quoteIds[0] }),
      /fixed quote/,
    );
    await as(sellers[0]);
    const question = await questionRpc("quote.question", {
      postId: post.id,
      question: "엘리베이터 있나요?",
    });
    await as(sellers[1]);
    assert.equal(
      (
        await questionRpc("quote.question", {
          postId: post.id,
          question: "엘리베이터  있나요?",
        })
      ).id,
      question.id,
    );
    await assert.rejects(
      questionRpc("quote.answer", {
        id: question.id,
        answer: "위조",
        shareConsent: true,
      }),
      /owner/,
    );
    await as(outsider);
    assert.equal(
      (await db.query("select * from quote_questions")).rows.length,
      0,
    );
    await assert.rejects(
      questionRpc("quote.question", { postId: post.id, question: "무단 질문" }),
      /participant/,
    );
    await as(buyer);
    await assert.rejects(
      questionRpc("quote.answer", { id: question.id, answer: "있음" }),
      /consent/,
    );
    await questionRpc("quote.answer", {
      id: question.id,
      answer: "엘리베이터 있음",
      shareConsent: true,
    });
    await as(sellers[1]);
    assert.equal(
      (await db.query<{ answer: string }>("select answer from quote_questions"))
        .rows[0].answer,
      "엘리베이터 있음",
    );
    await as(sellers[0]);
    await assert.rejects(
      rpc("quote.submit", {
        postId: post.id,
        proposalType: "estimate",
        amount: 200,
        amountMax: 100,
        priceCondition: "면적",
        message: "예상",
      }),
      /range/,
    );
    await rpc("quote.submit", {
      postId: post.id,
      proposalType: "estimate",
      amount: 110000,
      amountMax: 150000,
      priceCondition: "면적에 따라",
      message: "예상",
    });
    await as(buyer);
    await assert.rejects(
      rpc("quote.select", { id: quoteIds[0] }),
      /fixed quote/,
    );
    // An existing provider may finalize after the recruitment deadline.
    await db.exec("reset role");
    await db.query(
      "update quote_requests set expires_at=now()-interval '1 hour' where id=$1",
      [request],
    );
    await as(sellers[0]);
    await rpc("quote.submit", {
      postId: post.id,
      proposalType: "fixed",
      amount: 110000,
      message: "최종 견적",
    });
    await as(sellers[5]);
    await assert.rejects(
      rpc("quote.submit", {
        postId: post.id,
        amount: 100,
        message: "마감 후 신규",
      }),
      /closed/,
    );
    await db.exec("reset role");
    await db.query(
      "update quote_requests set expires_at=now()+interval '2 days' where id=$1",
      [request],
    );
    await as(sellers[0]);
    const fileId = randomUUID(),
      key = `${sellers[0]}/${quoteIds[0]}/${fileId}`;
    await db.query(
      "insert into storage.objects(bucket_id,name,owner_id) values('quote-documents',$1,$2)",
      [key, sellers[0]],
    );
    await db.query(
      "insert into media(id,owner_id,object_key,visibility,mime,size,quote_id,file_name,storage_provider) values($1,$2,$3,'private','application/pdf',100,$4,'견적.pdf','supabase')",
      [fileId, sellers[0], key, quoteIds[0]],
    );
    await as(sellers[5]);
    await assert.rejects(
      rpc("quote.submit", { postId: post.id, amount: 100000, message: "초과" }),
      /limit/,
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await as(buyer);
    assert.equal((await db.query("select * from quotes")).rows.length, 5);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from consumer_quote_contacts()")).rows.length,
      0,
    );
    const chat = (await rpc("quote.chat", { id: quoteIds[0] })).id;
    await as(sellers[0]);
    assert.equal((await rpc("quote.chat", { id: quoteIds[0] })).id, chat);
    await as(outsider);
    assert.equal((await db.query("select * from quotes")).rows.length, 0);
    await assert.rejects(rpc("quote.chat", { id: quoteIds[0] }), /participant/);
    await assert.rejects(rpc("quote.select", { id: quoteIds[0] }), /owner/);
    await db.exec(
      "reset role;update platform_settings set value='true' where key='quote_require_acceptance'",
    );
    await as(buyer);
    await rpc("quote.select", { id: quoteIds[0] });
    await rpc("quote.select", { id: quoteIds[0] });
    await assert.rejects(
      rpc("quote.select", { id: quoteIds[1] }),
      /already selected/,
    );
    assert.equal(
      (await db.query("select * from consumer_quote_contacts()")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from trade_confirmations")).rows.length,
      0,
    );
    await assert.rejects(
      rpc("review.create", { id: post.id, rating: 5, body: "아직 거래 전" }),
      /confirmation/,
    );
    await as(sellers[0]);
    await assert.rejects(
      rpc("quote.submit", {
        postId: post.id,
        amount: 120000,
        message: "선택 후 변경",
      }),
      /closed/,
    );
    await rpc("selection.accept", { id: post.id });
    await as(buyer);
    assert.equal(
      (
        await db.query<{ phone: string }>(
          "select * from consumer_quote_contacts()",
        )
      ).rows[0].phone,
      "010-0000-1234",
    );
    await rpc("trade.confirm", { id: post.id, confirmed: true });
    assert.equal(
      (
        await db.query<{ completed_at: string | null }>(
          "select completed_at from trade_confirmations",
        )
      ).rows[0].completed_at,
      null,
    );
    await rpc("review.create", {
      id: post.id,
      rating: 5,
      body: "고객이 확인한 거래 후기",
    });
    await assert.rejects(
      rpc("review.create", { id: post.id, rating: 4, body: "중복 후기" }),
      /unique/,
    );
    await as(sellers[0]);
    await rpc("trade.confirm", { id: post.id, confirmed: true });
    assert.ok(
      (
        await db.query<{ completed_at: string | null }>(
          "select completed_at from trade_confirmations",
        )
      ).rows[0].completed_at,
    );
    await rpc("trade.confirm", { id: post.id, confirmed: false });
    assert.equal(
      (
        await db.query<{ completed_at: string | null }>(
          "select completed_at from trade_confirmations",
        )
      ).rows[0].completed_at,
      null,
    );
    await as(buyer);
    await db.query("insert into blocks(owner_id,target_id) values($1,$2)", [
      buyer,
      sellers[0],
    ]);
    assert.equal(
      (await db.query("select * from consumer_quote_contacts()")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await assert.rejects(rpc("quote.chat", { id: quoteIds[0] }), /unavailable/);
    // DB writes do not gain privileges when switching roles or crafting direct requests.
    await assert.rejects(
      db.query(
        "update provider_profiles set verification='verified' where user_id=$1",
        [sellers[0]],
      ),
      /permission/,
    );
    await db.exec(
      "reset role;set role anon;select set_config('request.jwt.claim.sub','',false)",
    );
    await assert.rejects(rpc("profile.enableProvider"), /permission/);
    await db.exec("reset role");
    await db.query("update profiles set disabled=true where id=$1", [
      sellers[1],
    ]);
    await as(sellers[1]);
    await assert.rejects(rpc("profile.enableProvider"), /Active account/);
    assert.equal(
      (
        await db.query<{ state: string }>(
          "select state from quote_requests where id=$1",
          [request],
        )
      ).rows[0].state,
      "selected",
    );
    // Exercise the actual Supabase adapter against PostgreSQL RLS via a small
    // in-process PostgREST read/RPC transport (no cloud credentials or writes).
    await as(buyer);
    await db.query("delete from blocks where owner_id=$1", [buyer]);
    const client = createClient("https://fixture.supabase.co", "fixture", {
      global: {
        fetch: async (input, options) => {
          const url = new URL(String(input));
          const name = url.pathname.split("/").pop()!;
          assert.match(name, /^[a-z_]+$/);
          try {
            let data: unknown;
            if (url.pathname.includes("/rpc/")) {
              const args = JSON.parse(String(options?.body || "{}"));
              const keys = Object.keys(args);
              keys.forEach((key) => assert.match(key, /^[a-z_]+$/));
              const rows = (
                await db.query<Record<string, unknown>>(
                  `select * from ${name}(${keys.map((key, i) => `${key} => $${i + 1}`).join(",")})`,
                  Object.values(args),
                )
              ).rows;
              data = [
                "consumer_quote_summary",
                "consumer_quote_contacts",
              ].includes(name)
                ? rows
                : rows[0]?.[name];
            } else {
              const params: unknown[] = [];
              const where: string[] = [];
              for (const [key, value] of url.searchParams) {
                if (!value.startsWith("eq.")) continue;
                assert.match(key, /^[a-z_]+$/);
                params.push(value.slice(3));
                where.push(`${key}=$${params.length}`);
              }
              const rows = (
                await db.query(
                  `select * from ${name}${where.length ? " where " + where.join(" and ") : ""}`,
                  params,
                )
              ).rows;
              data = new Headers(options?.headers)
                .get("accept")
                ?.includes("vnd.pgrst.object")
                ? rows[0] || null
                : rows;
            }
            return new Response(JSON.stringify(data), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (error) {
            return new Response(JSON.stringify({ message: String(error) }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
        },
      },
    });
    const loaded = await loadCommunity(client, {
      id: buyer,
      email: "buyer@example.test",
    } as Identity);
    assert.equal(loaded.user?.role, "customer");
    const mapped = communitySnapshot(loaded.db, loaded.user).rows.find(
      (row) => row.id === post.id,
    )!;
    assert.equal(mapped.selectedProviderId, sellers[0]);
    assert.equal(mapped.quoteCount, 5);
    assert.equal(mapped.quoteState, "selected");
    assert.equal(
      loaded.db.rows.find(
        (row) => row.kind === "provider" && row.ownerId === sellers[0],
      )?.contact,
      "010-0000-1234",
    );
    assert.equal(
      loaded.db.rows.find((row) => row.id === fileId)?.targetId,
      quoteIds[0],
    );
    const newRequest = await communityAction(
      client,
      loaded.db,
      loaded.user!,
      "post.create",
      {
        type: "request",
        body: "어댑터 원자적 저장 검증",
        category: "자동차",
        serviceMode: "online",
        quoteEnabled: true,
        images: [],
      },
    );
    assert.equal(
      (
        await db.query("select * from quote_requests where post_id=$1", [
          (newRequest as { id: string }).id,
        ])
      ).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
