export type EventPlacement =
  "announcement_bar" | "home_banner" | "home_modal" | "my_page_entry";

export type EventContent = {
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
};

export type EventCampaign = {
  id: string;
  status: string;
  placements: EventPlacement[];
  platforms: string[];
  locales: string[];
  startAt?: string;
  endAt?: string;
  priority: number;
  defaultLocale?: string;
  localizedContent: Record<string, EventContent>;
  defaultContent: EventContent;
  frequency: "once" | "daily" | "every_3_days" | "per_session";
  delayMs: number;
};

const placementNames = new Set<EventPlacement>([
  "announcement_bar",
  "home_banner",
  "home_modal",
  "my_page_entry",
]);
const frequencies = new Set<EventCampaign["frequency"]>([
  "once",
  "daily",
  "every_3_days",
  "per_session",
]);

const string = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const strings = (value: unknown) =>
  Array.isArray(value) ? value.map(string).filter(Boolean) : [];
const content = (value: unknown): EventContent => {
  if (!value || typeof value !== "object") return {};
  const item = value as Record<string, unknown>;
  return {
    title: string(item.title) || undefined,
    body: string(item.body || item.description) || undefined,
    ctaLabel:
      string(item.ctaLabel || item.ctaText || item.buttonLabel) || undefined,
    ctaUrl: string(item.ctaUrl || item.ctaLink || item.url) || undefined,
    imageUrl: string(item.imageUrl || item.image) || undefined,
  };
};

/** Safely narrows the HQ-owned runtime payload without persisting it locally. */
export function parseEventCampaigns(payload: unknown): EventCampaign[] {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const source = Array.isArray(root.eventCampaigns)
    ? root.eventCampaigns
    : root.config &&
        typeof root.config === "object" &&
        Array.isArray((root.config as Record<string, unknown>).eventCampaigns)
      ? ((root.config as Record<string, unknown>).eventCampaigns as unknown[])
      : [];
  return source.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const placements = strings(item.placements || item.placement).filter(
      (value): value is EventPlacement =>
        placementNames.has(value as EventPlacement),
    );
    const id = string(item.id || item.campaignId || item.key);
    if (!id || !placements.length) return [];
    const localized =
      item.localizedContent && typeof item.localizedContent === "object"
        ? Object.fromEntries(
            Object.entries(
              item.localizedContent as Record<string, unknown>,
            ).map(([locale, value]) => [locale, content(value)]),
          )
        : {};
    const frequency = string(item.frequency || item.impressionFrequency);
    return [
      {
        id,
        status: string(item.status),
        placements,
        platforms: strings(item.platforms),
        locales: strings(item.locales),
        startAt: string(item.startAt) || undefined,
        endAt: string(item.endAt) || undefined,
        priority: Number.isFinite(Number(item.priority))
          ? Number(item.priority)
          : index,
        defaultLocale: string(item.defaultLocale) || undefined,
        localizedContent: localized,
        defaultContent: content(item.defaultContent),
        frequency: frequencies.has(frequency as EventCampaign["frequency"])
          ? (frequency as EventCampaign["frequency"])
          : "once",
        delayMs: Math.max(0, Number(item.delayMs) || 0),
      },
    ];
  });
}

export function campaignContent(
  campaign: EventCampaign,
  locale: string,
): EventContent {
  return (
    campaign.localizedContent[locale] ||
    (campaign.defaultLocale
      ? campaign.localizedContent[campaign.defaultLocale]
      : undefined) ||
    campaign.defaultContent
  );
}

export function selectEventCampaign(
  campaigns: EventCampaign[],
  placement: EventPlacement,
  locale: string,
  now = new Date(),
) {
  return campaigns
    .filter((campaign) => {
      const starts =
        !campaign.startAt ||
        new Date(campaign.startAt).getTime() <= now.getTime();
      const ends =
        !campaign.endAt || new Date(campaign.endAt).getTime() > now.getTime();
      return (
        campaign.status === "active" &&
        campaign.placements.includes(placement) &&
        (!campaign.platforms.length || campaign.platforms.includes("web")) &&
        (!campaign.locales.length || campaign.locales.includes(locale)) &&
        starts &&
        ends
      );
    })
    .sort((a, b) => b.priority - a.priority)[0];
}
