import test from "node:test";
import assert from "node:assert/strict";
import { scheduled } from "../workers/guide-scheduled.mjs";

test("guide cron stays inactive until enabled", async () => {
  await scheduled({}, {});
});
test("guide cron uses the existing worker binding and propagates failures", async () => {
  let calls = 0;
  const env = {
    GUIDE_AUTOMATION_ENABLED: "true",
    GUIDE_CRON_SECRET: "x".repeat(32),
    WORKER_SELF_REFERENCE: {
      async fetch(url: string, init: RequestInit) {
        calls++;
        assert.equal(url, "https://matda.net/api/guides/generate");
        assert.equal(init.method, "POST");
        assert.equal(new Headers(init.headers).get("authorization"), "Bearer " + "x".repeat(32));
        return new Response(null, { status: calls === 1 ? 200 : 503 });
      },
    },
  };
  await scheduled({}, env);
  await assert.rejects(scheduled({}, env), /HTTP 503/);
  await assert.rejects(scheduled({}, { ...env, GUIDE_CRON_SECRET: "" }), /missing/);
  assert.equal(calls, 2);
});
