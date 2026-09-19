import { randomUUID } from "node:crypto";
import type { Database } from "./types";
export function refreshReminders(db: Database, now = Date.now()) {
  for (const row of db.rows.filter(
    (r) => r.kind === "contract" || r.kind === "post",
  )) {
    const targets: { key: string; at: unknown; label: string }[] =
      row.kind === "contract"
        ? [
            { key: "expiry", at: row.endAt, label: "계약 만료" },
            { key: "inspection", at: row.inspectionAt, label: "사업장 점검" },
          ]
        : row.quoteEnabled && !row.selectedQuoteId
          ? [{ key: "quote", at: row.expiresAt, label: "견적 모집 마감" }]
          : [];
    for (const target of targets) {
      const due = Date.parse(String(target.at));
      if (!Number.isFinite(due)) continue;
      const days = Math.ceil((due - now) / 86400000);
      const threshold =
        row.kind === "post" ? 0 : days <= 1 ? 1 : days <= 7 ? 7 : 30;
      if (days > threshold) continue;
      const key = `${row.id}:${target.key}:${due}:${threshold}`;
      if (
        db.rows.some((n) => n.kind === "notification" && n.reminderKey === key)
      )
        continue;
      db.rows.push({
        id: randomUUID(),
        ownerId: row.ownerId,
        kind: "notification",
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        read: false,
        targetId: row.id,
        reminderKey: key,
        message: `${String(row.name || row.title)} · ${target.label} ${days < 0 ? "경과" : days === 0 ? "오늘" : `${days}일 전`}`,
      });
    }
  }
}
