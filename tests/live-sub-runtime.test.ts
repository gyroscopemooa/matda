import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isFlagEnabled,
  isMaintenanceActive,
  parseRuntimeConfig,
  resolveNoticeHref,
  selectBannerNotice,
} from "../src/lib/live-sub-runtime/parse";
import type { RuntimeNotice } from "../src/lib/live-sub-runtime/types";

const notice = (extra: Partial<RuntimeNotice>): RuntimeNotice => ({
  id: "n1",
  enabled: true,
  type: "banner",
  title: "제목",
  body: "본문",
  linkType: "none",
  priority: 0,
  dismissible: true,
  showOnce: false,
  ...extra,
});

test("parseRuntimeConfig ignores malformed notices and unknown fields", () => {
  const config = parseRuntimeConfig({
    featureFlags: { siteNotice: false, unknownFlag: "not-a-bool" },
    notices: [
      { id: "a", type: "banner", enabled: true, title: "A", body: "" },
      { id: "b", type: "unsupported-type", enabled: true },
      { type: "banner", enabled: true },
      "not-an-object",
    ],
    maintenance: { enabled: true, message: "점검 중", scope: "all" },
    somethingHqAddsLater: { foo: "bar" },
  });
  assert.equal(config.featureFlags.siteNotice, false);
  assert.equal(config.featureFlags.unknownFlag, undefined);
  assert.equal(config.notices.length, 1);
  assert.equal(config.notices[0]?.id, "a");
  assert.equal(config.maintenance?.message, "점검 중");
});

test("parseRuntimeConfig returns safe defaults for a garbage payload", () => {
  const config = parseRuntimeConfig(null);
  assert.deepEqual(config, { featureFlags: {}, notices: [], maintenance: null });
});

test("isFlagEnabled falls back to the default when config or key is missing", () => {
  assert.equal(isFlagEnabled(null, "siteNotice", true), true);
  const config = parseRuntimeConfig({ featureFlags: {} });
  assert.equal(isFlagEnabled(config, "siteNotice", true), true);
  const off = parseRuntimeConfig({ featureFlags: { siteNotice: false } });
  assert.equal(isFlagEnabled(off, "siteNotice", true), false);
});

test("selectBannerNotice picks the highest-priority enabled banner in period and locale", () => {
  const now = new Date("2026-09-24T00:00:00Z");
  const notices = [
    notice({ id: "low", priority: 1 }),
    notice({ id: "high", priority: 5 }),
    notice({ id: "disabled", priority: 9, enabled: false }),
    notice({ id: "wrong-type", priority: 9, type: "modal" }),
    notice({
      id: "expired",
      priority: 9,
      endAt: "2026-09-01T00:00:00Z",
    }),
    notice({
      id: "not-started",
      priority: 9,
      startAt: "2026-10-01T00:00:00Z",
    }),
    notice({ id: "other-locale", priority: 9, locales: ["en"] }),
  ];
  const selected = selectBannerNotice(notices, "ko", now);
  assert.equal(selected?.id, "high");
});

test("selectBannerNotice includes a notice whose locales list includes ko", () => {
  const now = new Date("2026-09-24T00:00:00Z");
  const selected = selectBannerNotice(
    [notice({ id: "ko-only", locales: ["ko", "en"] })],
    "ko",
    now,
  );
  assert.equal(selected?.id, "ko-only");
});

test("isMaintenanceActive requires scope all, enabled, and being within the window", () => {
  const now = new Date("2026-09-24T00:00:00Z");
  assert.equal(isMaintenanceActive(null, now), false);
  assert.equal(
    isMaintenanceActive({ enabled: false, message: "", scope: "all" }, now),
    false,
  );
  assert.equal(
    isMaintenanceActive({ enabled: true, message: "", scope: "web" }, now),
    false,
  );
  assert.equal(
    isMaintenanceActive({ enabled: true, message: "", scope: "all" }, now),
    true,
  );
  assert.equal(
    isMaintenanceActive(
      {
        enabled: true,
        message: "",
        scope: "all",
        startsAt: "2026-10-01T00:00:00Z",
      },
      now,
    ),
    false,
  );
  assert.equal(
    isMaintenanceActive(
      {
        enabled: true,
        message: "",
        scope: "all",
        endsAt: "2026-09-01T00:00:00Z",
      },
      now,
    ),
    false,
  );
});

test("resolveNoticeHref only accepts internal paths or https external links", () => {
  assert.deepEqual(resolveNoticeHref(notice({ targetUrl: "/quotes" })), {
    href: "/quotes",
    external: false,
  });
  assert.deepEqual(
    resolveNoticeHref(
      notice({ targetUrl: "https://live-sub.com/x", linkType: "external" }),
    ),
    { href: "https://live-sub.com/x", external: true },
  );
  assert.equal(
    resolveNoticeHref(
      notice({ targetUrl: "http://live-sub.com/x", linkType: "external" }),
    ),
    null,
  );
  assert.equal(
    resolveNoticeHref(
      notice({ targetUrl: "https://live-sub.com/x", linkType: "deeplink" }),
    ),
    null,
  );
  assert.equal(resolveNoticeHref(notice({})), null);
});
