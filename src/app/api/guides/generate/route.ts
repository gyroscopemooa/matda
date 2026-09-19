import { timingSafeEqual } from "node:crypto";
import { generateDailyGuide } from "@/lib/guide-server";
import { AppError } from "@/lib/types";
export async function POST(request: Request) {
  const secret = process.env.GUIDE_CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret || ""}`),
    actual = Buffer.from(request.headers.get("authorization") || "");
  if (
    !secret ||
    secret.length < 32 ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await generateDailyGuide(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof AppError ? e.message : "Generation failed" },
      { status: e instanceof AppError ? e.status : 500 },
    );
  }
}
