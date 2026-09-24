import type {
  RuntimeConfig,
  RuntimeMaintenance,
  RuntimeNotice,
  RuntimeNoticeLinkType,
  RuntimeNoticeType,
} from "./types";

const string = (value: unknown) => (typeof value === "string" ? value : "");
const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : undefined;
const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;
const number = (value: unknown, fallback: number) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const noticeTypes = new Set<RuntimeNoticeType>(["banner", "modal", "inline"]);
const linkTypes = new Set<RuntimeNoticeLinkType>([
  "external",
  "webview",
  "deeplink",
  "none",
]);

function parseNotice(raw: unknown, index: number): RuntimeNotice | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = string(item.id);
  const type = string(item.type);
  if (!id || !noticeTypes.has(type as RuntimeNoticeType)) return null;
  const linkType = string(item.linkType);
  return {
    id,
    enabled: bool(item.enabled, false),
    type: type as RuntimeNoticeType,
    title: string(item.title),
    body: string(item.body),
    ctaLabel: string(item.ctaLabel) || undefined,
    targetUrl: string(item.targetUrl) || undefined,
    linkType: linkTypes.has(linkType as RuntimeNoticeLinkType)
      ? (linkType as RuntimeNoticeLinkType)
      : "none",
    locales: strings(item.locales),
    startAt: string(item.startAt) || undefined,
    endAt: string(item.endAt) || undefined,
    priority: number(item.priority, index),
    dismissible: bool(item.dismissible, false),
    showOnce: bool(item.showOnce, false),
  };
}

function parseMaintenance(raw: unknown): RuntimeMaintenance | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  return {
    enabled: bool(item.enabled, false),
    message: string(item.message),
    scope: string(item.scope),
    startsAt: string(item.startsAt) || undefined,
    endsAt: string(item.endsAt) || undefined,
  };
}

/** Narrows the HQ payload to only the fields this client reads; unknown fields are ignored. */
export function parseRuntimeConfig(payload: unknown): RuntimeConfig {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const flagsRaw = root.featureFlags;
  const featureFlags: Record<string, boolean> = {};
  if (flagsRaw && typeof flagsRaw === "object") {
    for (const [key, value] of Object.entries(
      flagsRaw as Record<string, unknown>,
    )) {
      if (typeof value === "boolean") featureFlags[key] = value;
    }
  }
  const noticesRaw = Array.isArray(root.notices) ? root.notices : [];
  const notices = noticesRaw
    .map((raw, index) => parseNotice(raw, index))
    .filter((notice): notice is RuntimeNotice => notice !== null);
  return {
    featureFlags,
    notices,
    maintenance: parseMaintenance(root.maintenance),
  };
}

export function isFlagEnabled(
  config: RuntimeConfig | null,
  key: string,
  defaultValue: boolean,
): boolean {
  if (!config) return defaultValue;
  const value = config.featureFlags[key];
  return typeof value === "boolean" ? value : defaultValue;
}

function withinPeriod(
  startAt: string | undefined,
  endAt: string | undefined,
  now: number,
) {
  const starts = !startAt || new Date(startAt).getTime() <= now;
  const ends = !endAt || new Date(endAt).getTime() > now;
  return starts && ends;
}

export function selectBannerNotice(
  notices: RuntimeNotice[],
  locale: string,
  now = new Date(),
): RuntimeNotice | undefined {
  const time = now.getTime();
  return notices
    .filter(
      (notice) =>
        notice.enabled &&
        notice.type === "banner" &&
        (!notice.locales ||
          !notice.locales.length ||
          notice.locales.includes(locale)) &&
        withinPeriod(notice.startAt, notice.endAt, time),
    )
    .sort((a, b) => b.priority - a.priority)[0];
}

export function isMaintenanceActive(
  maintenance: RuntimeMaintenance | null,
  now = new Date(),
): boolean {
  if (!maintenance || !maintenance.enabled || maintenance.scope !== "all")
    return false;
  return withinPeriod(maintenance.startsAt, maintenance.endsAt, now.getTime());
}

export function resolveNoticeHref(
  notice: RuntimeNotice,
): { href: string; external: boolean } | null {
  if (!notice.targetUrl) return null;
  if (notice.targetUrl.startsWith("/"))
    return { href: notice.targetUrl, external: false };
  if (notice.linkType === "external" && notice.targetUrl.startsWith("https://"))
    return { href: notice.targetUrl, external: true };
  return null;
}
