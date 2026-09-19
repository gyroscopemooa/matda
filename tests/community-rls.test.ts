import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Phase 1 remote schema protects profiles, photos, chat, notifications and moderation", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222",
    c = "33333333-3333-4333-8333-333333333333";
  const post = "44444444-4444-4444-8444-444444444444",
    photo = "55555555-5555-4555-8555-555555555555";
  const as = async (id: string) =>
    db.exec(
      `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  const count = async (table: string) =>
    (await db.query<{ n: number }>(`select count(*)::int n from ${table}`))
      .rows[0].n;
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
    );
    for (const name of [
      "0001_foundation",
      "0002_transactional_rpc",
      "0003_free_post_type",
      "0004_community_launch",
    ])
      await db.exec(await readFile(`supabase/migrations/${name}.sql`, "utf8"));
    await db.exec(
      await readFile("supabase/migrations/0005_community_realtime.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/0006_request_categories.sql", "utf8"),
    );
    await db.exec(
      `create schema storage; create table storage.buckets(id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]); insert into storage.buckets(id) values('community-images'); create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, owner_id text); alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select,insert,delete on storage.objects to authenticated; create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`,
    );
    await db.exec(
      await readFile("supabase/migrations/0007_supabase_storage.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/0008_chat_leave.sql", "utf8"),
    );
    await db.exec(
      `insert into auth.users values('${a}'),('${b}'),('${c}');insert into community_admins values('${c}');`,
    );
    for (const id of [a, b, c]) {
      await as(id);
      await db.exec(
        `insert into profiles(id,display_name) values('${id}','이웃')`,
      );
    }
    await as(a);
    await db.exec(
      `insert into storage.objects(bucket_id,name,owner_id) values('community-images','${a}/${photo}','${a}')`,
    );
    await as(b);
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name,owner_id) values('community-images','${a}/another','${b}')`,
      ),
      /row-level security/,
    );
    assert.equal(await count("storage.objects"), 0);
    await db.exec(`delete from storage.objects where name='${a}/${photo}'`);
    await as(a);
    assert.equal(await count("storage.objects"), 1);
    await db.exec(`delete from storage.objects where name='${a}/${photo}'`);
    assert.equal(await count("storage.objects"), 0);
    await as(a);
    await db.exec(
      `insert into posts(author_id,post_type,audience,title,body,region,service_mode,category_id) values('${a}','request','consumer','웹 개발','홈페이지 제작','전국 · 온라인','online','제작·디지털')`,
    );
    await assert.rejects(
      db.exec(
        `insert into posts(author_id,post_type,audience,title,body,region,service_mode) values('${a}','request','consumer','잘못된 방식','내용','울산','online')`,
      ),
      /post_service_region/,
    );
    await assert.rejects(
      db.exec(
        `insert into organizations(owner_id,name) values('${a}','early BIZ')`,
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(`select submit_quote('${post}',100,'early quote')`),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(`update profiles set disabled=false where id='${a}'`),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(`insert into community_admins values('${a}')`),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(
        `update profiles set avatar='https://example.com/photo' where id='${a}'`,
      ),
      /Invalid avatar/,
    );
    await db.exec(
      `insert into media(id,owner_id,object_key,visibility,mime,size) values('${photo}','${a}','${a}/${photo}','public','image/png',10);update profiles set avatar='media:${photo}' where id='${a}';insert into posts(id,author_id,post_type,audience,title,body,region,images,schedule) values('${post}','${a}','free','consumer','자유글','동네 이야기','울산광역시 남구',array['${photo}']::uuid[],'{"scheduleMode":"range","desiredDate":"2026-10-01","desiredEndDate":"2026-10-03"}');`,
    );
    await as(b);
    await assert.rejects(
      db.exec(
        `insert into media(owner_id,object_key,visibility,mime,size) values('${b}','${a}/forged','public','image/png',10)`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(`update profiles set avatar='media:${photo}' where id='${b}'`),
      /Invalid avatar/,
    );
    await assert.rejects(
      db.exec(
        `insert into posts(author_id,post_type,audience,title,body,region,images) values('${b}','free','consumer','사진 도용','내용','울산',array['${photo}']::uuid[])`,
      ),
      /Invalid images/,
    );
    const chat = (
      await db.query<{ id: string }>(
        `select community_start_chat('${post}') id`,
      )
    ).rows[0].id;
    assert.equal(
      (
        await db.query<{ id: string }>(
          `select community_start_chat('${post}') id`,
        )
      ).rows[0].id,
      chat,
    );
    await db.exec(
      `insert into comments(post_id,author_id,body) values('${post}','${b}','댓글');insert into messages(conversation_id,sender_id,body) values('${chat}','${b}','안녕하세요')`,
    );
    assert.equal(await count("messages"), 1);
    await as(c);
    assert.equal(
      await count("messages"),
      0,
      "Even admins cannot read another conversation",
    );
    await assert.rejects(
      db.exec(`select community_leave_chat('${chat}')`),
      /Not a participant/,
    );
    await assert.rejects(
      db.exec(`select community_read_chat('${chat}')`),
      /Not a participant/,
    );
    await assert.rejects(
      db.exec(
        `insert into messages(conversation_id,sender_id,body) values('${chat}','${c}','침입')`,
      ),
      /row-level security/,
    );
    await as(a);
    assert.equal(await count("notifications"), 2);
    await db.exec(`select community_leave_chat('${chat}')`);
    assert.equal(
      (
        await db.query<{ n: number }>(
          `select count(*)::int n from conversation_members where conversation_id='${chat}' and user_id='${a}' and left_at is not null`,
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          `select count(*)::int n from conversation_members where conversation_id='${chat}' and user_id='${b}' and left_at is not null`,
        )
      ).rows[0].n,
      0,
    );
    assert.equal(await count("messages"), 1);
    await db.exec(
      `update notifications set read_at=now();select community_read_chat('${chat}')`,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          `select count(*)::int n from conversation_members where conversation_id='${chat}' and user_id='${a}' and left_at is not null`,
        )
      ).rows[0].n,
      0,
    );
    await assert.rejects(
      db.exec(`update notifications set message='forged'`),
      /permission denied/,
    );
    await db.exec(`insert into blocks values('${a}','${b}')`);
    await as(b);
    await assert.rejects(
      db.exec(`select community_start_chat('${post}')`),
      /Chat unavailable/,
    );
    await assert.rejects(
      db.exec(
        `insert into messages(conversation_id,sender_id,body) values('${chat}','${b}','차단 우회')`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(
        `insert into comments(post_id,author_id,body) values('${post}','${b}','차단 우회')`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(`select community_moderate('${post}','post','hidden')`),
      /Admin required/,
    );
    await as(c);
    await db.exec(
      `select community_moderate('${post}','post','hidden');select community_moderate('${b}','account','disabled')`,
    );
    await as(b);
    await assert.rejects(
      db.exec(
        `insert into posts(author_id,post_type,audience,title,body,region) values('${b}','free','consumer','제한 계정','내용','울산')`,
      ),
      /row-level security/,
    );
    await db.exec(
      `reset role;set role anon;select set_config('request.jwt.claim.sub','',false)`,
    );
    assert.equal(await count("posts"), 1);
    assert.equal(await count("comments"), 0);
    await db.exec("reset role");
    assert.equal(await count("community_audit"), 2);
  } finally {
    await db.close();
  }
});
