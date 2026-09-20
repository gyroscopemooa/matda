import test from "node:test";
import assert from "node:assert/strict";
import { createClient, type User as Identity } from "@supabase/supabase-js";
import {
  communityAction,
  loadCommunity,
} from "../src/lib/community-repository";
import { validateCommunityEnvironment } from "../src/lib/env";
import type { Database, User } from "../src/lib/types";
import { communitySnapshot } from "../src/lib/community-repository";

test("Remote mapping preserves schedule, authors beyond first page and never trusts schedule as permissions", async () => {
  const person = {
    id: "me",
    display_name: "이웃",
    region: "울산광역시 남구",
    avatar: "leaf",
    created_at: "2026-09-20",
  };
  const profiles = Array.from({ length: 501 }, (_, i) => ({
    ...person,
    id: i === 500 ? "me" : String(i),
  }));
  const client = createClient("https://test.supabase.co", "test", {
    global: {
      fetch: async (input) => {
        const url = new URL(String(input));
        const table = url.pathname.split("/").pop();
        let data: unknown = [];
        if (table === "profiles")
          data = url.searchParams.has("id")
            ? person
            : profiles.slice(
                Number(url.searchParams.get("offset") || 0),
                Number(url.searchParams.get("offset") || 0) + 500,
              );
        if (table === "community_admin") data = false;
        if (table === "posts")
          data = [
            {
              id: "post",
              author_id: "me",
              post_type: "free",
              status: "published",
              schedule: {
                scheduleMode: "range",
                desiredDate: "2026-10-01",
                desiredEndDate: "2026-10-03",
                ownerId: "attacker",
                kind: "audit",
                status: "hidden",
              },
            },
          ];
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  const { db, user } = await loadCommunity(client, {
    id: "me",
    email: "private@example.test",
  } as Identity);
  assert.equal(db.users.length, 501);
  assert.equal(user?.role, "customer");
  assert.equal(db.rows[0].ownerId, "me");
  assert.equal(db.rows[0].kind, "post");
  assert.equal(db.rows[0].status, "published");
  assert.equal(db.rows[0].authorName, "이웃");
  assert.equal(db.rows[0].desiredEndDate, "2026-10-03");
  assert.equal(db.users.filter((u) => u.email).length, 1);
});
test("Remote writes retain optional category and range end date without enabling later phases", async () => {
  const writes: Record<string, unknown>[] = [];
  const client = createClient("https://test.supabase.co", "test", {
    global: {
      fetch: async (_input, options) => {
        writes.push(JSON.parse(String(options?.body)));
        return new Response(JSON.stringify({ id: "saved" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  const user: User = {
    id: "me",
    name: "이웃",
    email: "",
    password: "",
    role: "customer",
    region: "울산광역시 남구",
    createdAt: new Date().toISOString(),
  };
  const db: Database = { users: [user], sessions: [], rows: [] };
  await communityAction(client, db, user, "post.create", {
    type: "free",
    body: "동네 자유글",
    region: user.region,
    scheduleMode: "range",
    desiredDate: "2026-10-01",
    desiredEndDate: "2026-10-03",
  });
  assert.equal(writes[0].category_id, null);
  assert.deepEqual(writes[0].schedule, {
    scheduleMode: "range",
    desiredDate: "2026-10-01",
    desiredEndDate: "2026-10-03",
  });
  await assert.rejects(
    communityAction(client, db, user, "post.create", { quoteEnabled: true }),
    /내용/,
  );
  await assert.rejects(
    communityAction(client, db, user, "quote.create", {}),
    /공개 단계/,
  );
});
test("Remote launch configuration fails closed for later phases, local URLs and missing keys", () => {
  const env = {
    DATA_ADAPTER: "supabase",
    NEXT_PUBLIC_RELEASE_PHASE: "1",
    NEXT_PUBLIC_SITE_URL: "https://matda.net",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test",
    NODE_ENV: "production",
  };
  assert.doesNotThrow(() => validateCommunityEnvironment(env));
  assert.throws(() =>
    validateCommunityEnvironment({ ...env, NEXT_PUBLIC_RELEASE_PHASE: "2" }),
  );
  assert.doesNotThrow(() =>
    validateCommunityEnvironment({
      ...env,
      NEXT_PUBLIC_RELEASE_PHASE: "2",
      CONSUMER_QUOTES_REMOTE_ENABLED: "true",
    }),
  );
  assert.throws(() =>
    validateCommunityEnvironment({
      ...env,
      NEXT_PUBLIC_RELEASE_PHASE: "3",
      CONSUMER_QUOTES_REMOTE_ENABLED: "true",
    }),
  );
  assert.throws(() =>
    validateCommunityEnvironment({
      ...env,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3107",
    }),
  );
  assert.throws(() =>
    validateCommunityEnvironment({
      ...env,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    }),
  );
});

test("Remote request conversion uses a consented RPC and preserves server aggregate counts", async () => {
  const calls: Record<string, unknown>[] = [];
  const client = createClient("https://test.supabase.co", "test", {
    global: {
      fetch: async (input, options) => {
        const name = new URL(String(input)).pathname.split("/").pop();
        if (name === "consumer_quote_request") {
          calls.push(JSON.parse(String(options?.body)));
          return new Response(JSON.stringify("request-id"), {
            headers: { "Content-Type": "application/json" },
          });
        }
        const data =
          name === "posts"
            ? [
                {
                  id: "post",
                  author_id: "owner",
                  post_type: "request",
                  status: "published",
                },
              ]
            : name === "consumer_quote_summary"
              ? [
                  {
                    post_id: "post",
                    request_id: "request-id",
                    started_at: "2026-09-20",
                    expires_at: "2099-01-01",
                    quote_limit: 5,
                    extension_count: 0,
                    quote_count: 4,
                  },
                ]
              : [];
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  });
  const { db } = await loadCommunity(client, null);
  const view = communitySnapshot(db);
  assert.equal(view.rows.find((r) => r.id === "post")?.quoteCount, 4);
  assert.equal(db.rows[0].quoteEnabled, true);
  const user: User = {
    id: "owner",
    name: "고객",
    email: "",
    password: "",
    role: "customer",
    region: "",
    createdAt: "2026-09-20",
  };
  assert.deepEqual(
    await communityAction(client, db, user, "quote.enable", {
      id: "post",
      consent: true,
    }),
    { id: "post", requestId: "request-id" },
  );
  assert.deepEqual(calls, [
    { target: "post", operation: "enable", consent: true },
  ]);
});
