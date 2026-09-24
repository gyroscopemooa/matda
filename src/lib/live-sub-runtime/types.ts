export type RuntimeNoticeType = "banner" | "modal" | "inline";
export type RuntimeNoticeLinkType =
  | "external"
  | "webview"
  | "deeplink"
  | "none";

export type RuntimeNotice = {
  id: string;
  enabled: boolean;
  type: RuntimeNoticeType;
  title: string;
  body: string;
  ctaLabel?: string;
  targetUrl?: string;
  linkType: RuntimeNoticeLinkType;
  locales?: string[];
  startAt?: string;
  endAt?: string;
  priority: number;
  dismissible: boolean;
  showOnce: boolean;
};

export type RuntimeMaintenance = {
  enabled: boolean;
  message: string;
  scope: string;
  startsAt?: string;
  endsAt?: string;
};

export type RuntimeConfig = {
  featureFlags: Record<string, boolean>;
  notices: RuntimeNotice[];
  maintenance: RuntimeMaintenance | null;
};
