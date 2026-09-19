import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const ids = {
  a: "11111111-1111-4111-8111-111111111111",
  b: "22222222-2222-4222-8222-222222222222",
  c: "33333333-3333-4333-8333-333333333333",
  org: "44444444-4444-4444-8444-444444444444",
  post: "55555555-5555-4555-8555-555555555555",
  request: "66666666-6666-4666-8666-666666666666",
  tender: "77777777-7777-4777-8777-777777777777",
  bid: "88888888-8888-4888-8888-888888888888",
  chat: "99999999-9999-4999-8999-999999999999",
};
test("Postgres migration: RLS private quotes/chat/org/sealed bid, denied writes and integer checks", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
    await db.exec(
      await readFile("supabase/migrations/0001_foundation.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/0002_transactional_rpc.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/0003_free_post_type.sql", "utf8"),
    );
    await db.exec(
      `insert into auth.users values('${ids.a}'),('${ids.b}'),('${ids.c}');insert into profiles(id,display_name) values('${ids.a}','buyer'),('${ids.b}','bidder'),('${ids.c}','outsider');insert into organizations(id,owner_id,name) values('${ids.org}','${ids.a}','org');insert into posts(id,author_id,post_type,audience,title,body,region) values('${ids.post}','${ids.a}','request','consumer','title','body','Seoul');insert into quote_requests(id,post_id) values('${ids.request}','${ids.post}');insert into quotes(request_id,provider_id,amount,message) values('${ids.request}','${ids.b}',123,'private');insert into conversations(id,created_by) values('${ids.chat}','${ids.a}');insert into conversation_members values('${ids.chat}','${ids.a}',null),('${ids.chat}','${ids.b}',null);insert into messages(conversation_id,sender_id,body) values('${ids.chat}','${ids.b}','secret');insert into tenders(id,buyer_org,title,scope,eligibility,evaluation_method,starts_at,deadline_at,status) values('${ids.tender}','${ids.org}','sealed','scope','registered','manual',now()-interval '2 days',now()-interval '1 day','published');insert into bids(id,tender_id,bidder_id) values('${ids.bid}','${ids.tender}','${ids.b}');insert into bid_versions(bid_id,version,amount,proposal) values('${ids.bid}',1,456,'sealed secret');`,
    );
    const as = async (id: string) =>
      db.exec(
        `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    const count = async (table: string) =>
      (
        await db.query<{ count: number }>(
          `select count(*)::int as count from ${table}`,
        )
      ).rows[0].count;
    await as(ids.c);
    for (const table of [
      "quotes",
      "messages",
      "organizations",
      "bids",
      "bid_versions",
    ])
      assert.equal(await count(table), 0, table + " outsider denied");
    await assert.rejects(
      db.exec(
        `insert into messages(conversation_id,sender_id,body) values('${ids.chat}','${ids.c}','intrusion')`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(`update bid_versions set amount=1`),
      /permission denied/,
    );
    await as(ids.a);
    assert.equal(await count("quotes"), 1);
    assert.equal(await count("messages"), 1);
    assert.equal(await count("bids"), 0);
    assert.equal(await count("bid_versions"), 0);
    await as(ids.b);
    assert.equal(await count("bid_versions"), 1);
    assert.equal(await count("quotes"), 1);
    assert.equal(await count("organizations"), 0);
    await as(ids.c);
    await assert.rejects(
      db.exec(`select open_tender('${ids.tender}')`),
      /permission/,
    );
    await as(ids.a);
    await db.exec(`select open_tender('${ids.tender}')`);
    assert.equal(await count("bid_versions"), 1);
    await db.exec(
      `select award_tender('${ids.tender}','${ids.bid}','manual evaluation')`,
    );
    assert.equal(await count("tender_audit_logs"), 2);
    await assert.rejects(
      db.exec(`select open_tender('${ids.tender}')`),
      /already opened/,
    );
    const tables = await db.query<{ tablename: string; rowsecurity: boolean }>(
      "select tablename,rowsecurity from pg_tables where schemaname='public'",
    );
    assert.ok(tables.rows.length >= 30);
    assert.ok(tables.rows.every((t) => t.rowsecurity));
  } finally {
    await db.close();
  }
});
