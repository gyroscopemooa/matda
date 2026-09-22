"use client";
/* eslint-disable @next/next/no-img-element -- HQ supplies dynamic image hosts. */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  campaignContent,
  parseEventCampaigns,
  selectEventCampaign,
  type EventCampaign,
  type EventPlacement as Placement,
} from "@/lib/event-campaigns";

const CampaignContext = createContext<EventCampaign[]>([]);
const locale = () =>
  typeof navigator === "undefined" ? "ko" : navigator.language || "ko";
const storageKey = (campaign: EventCampaign, placement: Placement) =>
  `matda-event-impression:${campaign.id}:${placement}`;

function seen(campaign: EventCampaign, placement: Placement) {
  try {
    const key = storageKey(campaign, placement);
    if (campaign.frequency === "per_session")
      return !!sessionStorage.getItem(key);
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    if (campaign.frequency === "once") return true;
    return (
      Date.now() - at <
      (campaign.frequency === "daily" ? 86_400_000 : 259_200_000)
    );
  } catch {
    return false;
  }
}
function record(campaign: EventCampaign, placement: Placement) {
  try {
    const key = storageKey(campaign, placement);
    if (campaign.frequency === "per_session") sessionStorage.setItem(key, "1");
    else localStorage.setItem(key, String(Date.now()));
  } catch {
    /* Storage privacy settings must not affect the page. */
  }
}

export function EventCampaignProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [campaigns, setCampaigns] = useState<EventCampaign[]>([]);
  useEffect(() => {
    let active = true;
    void fetch("/api/runtime/matda", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : { eventCampaigns: [] },
      )
      .then((payload) => {
        if (active) setCampaigns(parseEventCampaigns(payload));
      })
      .catch(() => {
        if (active) setCampaigns([]);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <CampaignContext.Provider value={campaigns}>
      {children}
    </CampaignContext.Provider>
  );
}

/** Shared selector hook for any future MATDA web placement. */
export function useEventCampaign(placement: Placement) {
  const campaigns = useContext(CampaignContext);
  return useMemo(
    () => selectEventCampaign(campaigns, placement, locale()),
    [campaigns, placement],
  );
}

export function EventCampaignPlacement({
  placement,
}: {
  placement: Placement;
}) {
  const campaign = useEventCampaign(placement);
  const [dismissed, setDismissed] = useState("");
  const [shownFor, setShownFor] = useState("");
  useEffect(() => {
    if (!campaign || seen(campaign, placement)) return;
    const delay = placement === "home_modal" ? campaign.delayMs : 0;
    const timer = window.setTimeout(() => {
      setShownFor(campaign.id);
      record(campaign, placement);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [campaign, placement]);
  const visible =
    !!campaign && shownFor === campaign.id && dismissed !== campaign.id;
  if (!campaign || !visible) return null;
  return (
    <CampaignCard
      campaign={campaign}
      placement={placement}
      onClose={() => setDismissed(campaign.id)}
    />
  );
}

function CampaignCard({
  campaign,
  placement,
  onClose,
}: {
  campaign: EventCampaign;
  placement: Placement;
  onClose: () => void;
}) {
  const item = campaignContent(campaign, locale());
  const cta =
    item.ctaLabel && item.ctaUrl ? (
      <Link className="event-campaign-cta" href={item.ctaUrl}>
        {item.ctaLabel}
      </Link>
    ) : null;
  const card = (
    <>
      {/* HQ image URLs are dynamic, so Next image host allowlisting cannot be used here. */}
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      <div className="event-campaign-copy">
        {item.title && <strong>{item.title}</strong>}
        {item.body && <span>{item.body}</span>}
        {cta}
      </div>
    </>
  );
  if (!item.title && !item.body && !cta && !item.imageUrl) return null;
  if (placement === "home_modal")
    return (
      <div className="event-campaign-modal-backdrop" role="presentation">
        <section
          className="event-campaign event-campaign-modal"
          role="dialog"
          aria-modal="true"
          aria-label={item.title || "이벤트 안내"}
        >
          {card}
          <button
            className="event-campaign-close"
            aria-label="이벤트 닫기"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </section>
      </div>
    );
  return (
    <section className={`event-campaign event-campaign-${placement}`}>
      {card}
      {placement === "announcement_bar" && (
        <button
          className="event-campaign-close"
          aria-label="이벤트 닫기"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      )}
    </section>
  );
}
