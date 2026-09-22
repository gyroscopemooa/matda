import { NextResponse } from "next/server";
import { parseEventCampaigns } from "@/lib/event-campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A deliberately fail-closed proxy: HQ remains the sole campaign source. */
export async function GET() {
  const baseUrl = process.env.LIVESUB_RUNTIME_BASE_URL;
  if (!baseUrl) return NextResponse.json({ eventCampaigns: [] });
  try {
    const env =
      process.env.LIVESUB_RUNTIME_ENV || process.env.NODE_ENV || "development";
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = new URL("api/runtime/v1/apps/matda/config", normalizedBase);
    url.searchParams.set("env", env);
    url.searchParams.set("platform", "web");
    url.searchParams.set("appVersion", "web");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ eventCampaigns: [] });
    const payload = await response.json();
    return NextResponse.json({ eventCampaigns: parseEventCampaigns(payload) });
  } catch {
    return NextResponse.json({ eventCampaigns: [] });
  }
}
