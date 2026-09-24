# LIVE-SUB HQ Runtime — Site Notice / Maintenance Client

Browser-only client that reads LIVE-SUB HQ's Runtime Config API and shows, at most, a
one-line notice banner or a maintenance strip above `{children}` in `src/app/layout.tsx`.
It is independent of the existing `EventCampaign` system (`/api/runtime/matda`,
`src/lib/event-campaigns.ts`, `src/components/event-campaigns.tsx`), which already renders
its own `announcement_bar` inside `workspace.tsx`. Both can appear at the top of the page at
the same time; they were kept separate deliberately (see "Relationship to the existing HQ
integration" below).

## Files

- `src/lib/live-sub-runtime/types.ts` — `RuntimeNotice`, `RuntimeMaintenance`, `RuntimeConfig`.
- `src/lib/live-sub-runtime/env.ts` — env var reads + storage key names.
- `src/lib/live-sub-runtime/parse.ts` — pure, DOM-free validation and selection logic
  (`parseRuntimeConfig`, `isFlagEnabled`, `selectBannerNotice`, `isMaintenanceActive`,
  `resolveNoticeHref`). Unit tested in `tests/live-sub-runtime.test.ts`.
- `src/lib/live-sub-runtime/store.ts` — `"use client"` module-singleton fetch (3s timeout,
  localStorage cache, `useSyncExternalStore`) + the `useRuntimeFlag` / `useRuntimeNotices` /
  `useRuntimeMaintenance` hooks.
- `src/lib/live-sub-runtime/index.ts` — barrel export.
- `src/components/runtime-site-notice.tsx` — `<RuntimeSiteNotice />`, the actual banner.
- `src/app/layout.tsx` — renders `<RuntimeSiteNotice />` directly above `{children}`.

## Behavior

- One fetch per page load, from the browser: `GET {base}/api/runtime/v1/apps/matda/config?env={env}&platform=web&appVersion=web`, no credentials.
- 3s timeout. On any failure (timeout, network error, non-2xx, malformed JSON) the last
  value read from `localStorage["livesub.runtime.v1.{env}"]` is kept; if there is none,
  nothing renders. HQ is never called from the server, build, or middleware.
- On success the raw payload is cached to that same localStorage key so the next page load
  has a value to show before the new fetch resolves.
- Unknown response fields are ignored; only `featureFlags`, `notices[]`, `maintenance` are read.
- `siteNotice` feature flag defaults to `true` when HQ has not set it or hasn't answered yet.
- If `maintenance.enabled && maintenance.scope === "all"` (and, if set, `startsAt`/`endsAt`
  bound the current time), the maintenance message takes the banner slot instead of any
  notice — the two never stack. No feature is blocked; it's copy only.
- Otherwise, among `type: "banner"` notices that are `enabled`, within `startAt`/`endAt`,
  and match locale `"ko"` (or have no `locales` list), the highest-`priority` one is shown.
- `dismissible: true` notices get a close (×) button; closing writes the notice id to
  `localStorage["livesub.runtime.dismissed.{env}"]` so it stays hidden on future loads.
- `showOnce: true` notices are written to the same dismissed-id storage the first time they
  render, so they show for the current page view but not again on the next load — this is
  an interpretation of the `showOnce` field (the brief specifies dismiss-tracking but not an
  exact once-only semantic); flag it to HQ/product if a different behavior is wanted.
- Link resolution: `targetUrl` starting with `/` → internal `next/link`. Otherwise, only
  `linkType: "external"` with an `https://` URL renders, as a new-tab `<a rel="noopener">`.
  Anything else (`webview`, `deeplink`, `none`, non-https) is ignored — no link is shown.

## Env vars (`.env.example`)

```
NEXT_PUBLIC_LIVESUB_RUNTIME_BASE_URLS=https://runtime.live-sub.com
NEXT_PUBLIC_LIVESUB_RUNTIME_ENV=production
```

Both are `NEXT_PUBLIC_*`, inlined at build time — no `wrangler.jsonc` change needed since the
defaults already match production. No new dependency was added (validation is hand-rolled,
matching the existing `event-campaigns.ts` pattern).

## Relationship to the existing HQ integration

This repo already had a working LIVE-SUB HQ pipeline before this change:

- `src/app/api/runtime/matda/route.ts` — server-side, fail-closed proxy using the
  server-only `LIVESUB_RUNTIME_BASE_URL` env var.
- `src/lib/event-campaigns.ts` + `src/components/event-campaigns.tsx` — parses an
  `eventCampaigns[]` payload and renders `announcement_bar` / `home_banner` / `home_modal` /
  `my_page_entry` placements, wired into `workspace.tsx`.

The new module is a second, independent HQ surface (`featureFlags` / `notices[]` /
`maintenance`, fetched directly from the browser via CORS) per this task's brief, built
alongside — not merged into — the existing one. This was a deliberate choice confirmed with
the user rather than an oversight: see the note below on that decision.

## Local testing

This session runs in an isolated cloud container, not the local Windows machine the original
brief assumed (`C:\7.MatDa`, a `local/release-push-policy-20260920` branch, a same-PC HQ at
`localhost:3000`, and a `C:\6.mooaresume` reference implementation) — none of that exists
here, so local browser verification could not be done in this session. To test on a machine
that does have HQ running locally:

```
NEXT_PUBLIC_LIVESUB_RUNTIME_BASE_URLS=http://localhost:3000 NEXT_PUBLIC_LIVESUB_RUNTIME_ENV=staging npx next dev -p 3002
```

then open `http://localhost:3002` and check:
1. The "HQ 테스트 공지" banner appears above the page content.
2. With HQ stopped, the site still works and the banner disappears (or shows the last
   cached value if one was already stored in that browser's localStorage).
3. Community post list / composer are unaffected.

## What was verified in this session

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npm test` — all 53 tests pass, including 7 new tests in
  `tests/live-sub-runtime.test.ts` covering payload parsing/sanitization, flag defaulting,
  banner selection (priority, period, locale), maintenance-window gating, and link resolution.
- `npm run build` — succeeds with no HQ reachable, confirming the HQ call only happens in
  the browser, never during build/SSR.
- Browser verification against a live HQ was not possible in this container (see above).
