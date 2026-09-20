import test from "node:test";
import assert from "node:assert/strict";
import { serverSetting } from "../src/lib/server-setting";

test("Worker settings override Node env; plain Node falls back without exposing values", () => {
  const symbol = Symbol.for("__cloudflare-context__");
  const scope = globalThis as unknown as Record<symbol, unknown>;
  const previous = scope[symbol];
  const old = process.env.GUIDE_SETTING_TEST;
  try {
    delete scope[symbol];
    process.env.GUIDE_SETTING_TEST = " local-test ";
    assert.equal(serverSetting("GUIDE_SETTING_TEST"), "local-test");
    scope[symbol] = { env: { GUIDE_SETTING_TEST: " worker-test " } };
    assert.equal(serverSetting("GUIDE_SETTING_TEST"), "worker-test");
    scope[symbol] = { env: { GUIDE_SETTING_TEST: " " } };
    assert.equal(serverSetting("GUIDE_SETTING_TEST"), undefined);
  } finally {
    if (previous === undefined) delete scope[symbol];
    else scope[symbol] = previous;
    if (old === undefined) delete process.env.GUIDE_SETTING_TEST;
    else process.env.GUIDE_SETTING_TEST = old;
  }
});
