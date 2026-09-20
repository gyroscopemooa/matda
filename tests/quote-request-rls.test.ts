import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Phase 2A RPC: gated, owner-only, idempotent request conversion and aggregate-only public counts", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const post = "33333333-3333-4333-8333-333333333333";
  const as = (id: string) =>
    db.exec(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  const call = (operation: string, consent = "true") =>
    db.query<{ id: string }>(
      `select consumer_quote_request('${post}','${operation}',${consent}) id`,
    );
  try {
    await db.exec(
      "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;",
    );
    for (const name of [
      "0001_foundation",
      "0002_transactional_rpc",
      "0003_free_post_type",
      "0004_community_launch",
      "0005_community_realtime",
      "0006_request_categories",
    ])
      await db.exec(await readFile(`supabase/migrations/${name}.sql`, "utf8"));
    // The column is introduced by the seed migration 0010; this fixture has no production identities.
    await db.exec(
      "alter table posts add column is_sample boolean not null default false",
    );
    const migration = await readFile(
      "supabase/migrations/0015_quote_request_conversion.sql",
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(
      `insert into auth.users values('${owner}'),('${other}');insert into profiles(id,display_name) values('${owner}','고객'),('${other}','타인');insert into posts(id,author_id,post_type,audience,category_id,title,body,region,created_at) values('${post}','${owner}','request','consumer','청소·관리','기존 글','유지할 내용','서울',now()-interval '30 days');`,
    );
    await as(owner);
    await assert.rejects(call("enable"), /not released/);
    await db.exec(
      "reset role; update platform_settings set value='true' where key='consumer_quotes_enabled'",
    );
    await as(other);
    await assert.rejects(call("enable"), /owner/);
    await as(owner);
    await assert.rejects(call("enable", "false"), /consent/);
    const request = (await call("enable")).rows[0].id;
    assert.equal((await call("enable")).rows[0].id, request);
    const timing = await db.query<{ hours: number }>(
      `select extract(epoch from (expires_at-started_at))/3600 hours from quote_requests where id='${request}'`,
    );
    assert.equal(Number(timing.rows[0].hours), 72);
    await assert.rejects(
      db.exec(
        `update quote_requests set quote_limit=100 where id='${request}'`,
      ),
      /permission/,
    );
    await assert.rejects(
      db.exec(`update posts set post_type='question' where id='${post}'`),
      /classification/,
    );
    await call("expand");
    await call("extend");
    await call("extend");
    await assert.rejects(call("extend"), /Extension/);
    const limits = (
      await db.query<{ quote_limit: number; hours: number }>(
        `select quote_limit,extract(epoch from (expires_at-started_at))/3600 hours from quote_requests where id='${request}'`,
      )
    ).rows[0];
    assert.equal(limits.quote_limit, 10);
    assert.equal(Number(limits.hours), 120);
    const createRequest = async (category: string) =>
      (
        await db.query<{ id: string }>(
          `insert into posts(author_id,post_type,audience,category_id,title,body,region) values('${owner}','request','consumer','${category}','요청','내용','서울') returning id`,
        )
      ).rows[0].id;
    const second = await createRequest("청소·관리");
    await db.exec(`select consumer_quote_request('${second}','enable',true)`);
    const third = await createRequest("청소·관리");
    await assert.rejects(
      db.exec(`select consumer_quote_request('${third}','enable',true)`),
      /limit/,
    );
    for (const category of ["자동차", "이사·운송", "제작·디지털"]) {
      const id = await createRequest(category);
      await db.exec(`select consumer_quote_request('${id}','enable',true)`);
    }
    const sixth = await createRequest("수리·설치");
    await assert.rejects(
      db.exec(`select consumer_quote_request('${sixth}','enable',true)`),
      /limit/,
    );
    await db.exec(
      `reset role;insert into quotes(request_id,provider_id,amount,message) values('${request}','${other}',12345,'비공개 견적');set role anon;select set_config('request.jwt.claim.sub','',false)`,
    );
    const summary = (
      await db.query<{ quote_count: number; message?: string }>(
        `select * from consumer_quote_summary() where post_id='${post}'`,
      )
    ).rows[0];
    assert.equal(Number(summary.quote_count), 1);
    assert.equal(summary.message, undefined);
    await assert.rejects(db.exec("select * from quotes"), /permission/);
    await db.exec(
      `reset role; update posts set status='hidden' where id='${post}'; set role anon`,
    );
    assert.equal(
      (
        await db.query(
          `select * from consumer_quote_summary() where post_id='${post}'`,
        )
      ).rows.length,
      0,
    );
    await db.exec(
      `reset role; update posts set status='published' where id='${post}';update profiles set disabled=true where id='${owner}'`,
    );
    await as(owner);
    await assert.rejects(call("expand"), /Active account/);
  } finally {
    await db.close();
  }
});
