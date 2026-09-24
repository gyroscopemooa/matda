"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  RUNTIME_DISMISSED_STORAGE_KEY,
  isMaintenanceActive,
  resolveNoticeHref,
  selectBannerNotice,
  useRuntimeFlag,
  useRuntimeMaintenance,
  useRuntimeNotices,
} from "@/lib/live-sub-runtime";

const LOCALE = "ko";

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(RUNTIME_DISMISSED_STORAGE_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(
      RUNTIME_DISMISSED_STORAGE_KEY,
      JSON.stringify([...ids]),
    );
  } catch {
    /* Storage privacy settings must not affect the page. */
  }
}

/** Top-of-page HQ notice/maintenance strip. Independent of the workspace event-campaign banners. */
export function RuntimeSiteNotice() {
  const siteNoticeEnabled = useRuntimeFlag("siteNotice", true);
  const notices = useRuntimeNotices();
  const maintenance = useRuntimeMaintenance();
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    typeof window === "undefined" ? new Set() : readDismissed(),
  );

  const notice = useMemo(() => {
    if (!siteNoticeEnabled) return undefined;
    const visible = notices.filter((item) => !dismissed.has(item.id));
    return selectBannerNotice(visible, LOCALE);
  }, [siteNoticeEnabled, notices, dismissed]);

  useEffect(() => {
    if (!notice || !notice.showOnce) return;
    const stored = readDismissed();
    if (!stored.has(notice.id)) {
      stored.add(notice.id);
      writeDismissed(stored);
    }
  }, [notice]);

  const maintenanceActive = isMaintenanceActive(maintenance);
  if (maintenanceActive && maintenance) {
    return (
      <div className="runtime-site-notice runtime-site-notice-maintenance" role="status">
        <span>{maintenance.message || "서비스 점검 안내"}</span>
      </div>
    );
  }

  if (!notice) return null;

  const link = resolveNoticeHref(notice);
  const dismiss = () => {
    setDismissed((prev) => {
      const next = new Set(prev).add(notice.id);
      writeDismissed(next);
      return next;
    });
  };

  return (
    <div className="runtime-site-notice" role="status">
      <div className="runtime-site-notice-copy">
        {notice.title && <strong>{notice.title}</strong>}
        {notice.body && <span>{notice.body}</span>}
      </div>
      {link && notice.ctaLabel && (
        link.external ? (
          <a
            className="runtime-site-notice-cta"
            href={link.href}
            target="_blank"
            rel="noopener"
          >
            {notice.ctaLabel}
          </a>
        ) : (
          <Link className="runtime-site-notice-cta" href={link.href}>
            {notice.ctaLabel}
          </Link>
        )
      )}
      {notice.dismissible && (
        <button
          className="runtime-site-notice-close"
          aria-label="공지 닫기"
          onClick={dismiss}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
