import { NextResponse } from "next/server";
import { refreshReminders } from "@/lib/reminders";
import { transact } from "@/lib/store";
import {
  currentUser,
  needUser,
  sessionToken,
  checkOrigin,
  rateLimit,
} from "@/lib/auth";
import { act, snapshot } from "@/lib/domain";
import { AppError } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const token = await sessionToken();
    return NextResponse.json(
      await transact((db) => {
        refreshReminders(db);
        return snapshot(db, currentUser(db, token));
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const token = await sessionToken();
    const data = await request.json();
    return NextResponse.json(
      await transact((db) => {
        const user = needUser(currentUser(db, token));
        rateLimit(user.id);
        const result = act(db, user, data.action, data.input || {});
        return { result, ...snapshot(db, user) };
      }),
    );
  } catch (e) {
    return failure(e);
  }
}
function failure(e: unknown) {
  return NextResponse.json(
    {
      error:
        e instanceof AppError
          ? e.message
          : "처리 중 문제가 발생했습니다. 다시 시도해주세요.",
    },
    { status: e instanceof AppError ? e.status : 500 },
  );
}
