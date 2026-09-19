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
import { remoteEnabled } from "@/lib/community-repository";
import { remoteApp } from "@/lib/community-api";
import { supabaseAuth } from "@/lib/supabase-auth";
import { applyRemoteProfile, persistRemoteProfile } from "@/lib/remote-profile";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (remoteEnabled()) return remoteApp();
  try {
    const token = await sessionToken();
    const cookieResponse = new NextResponse();
    const payload = await transact(async (db) => {
      const user = currentUser(db, token);
      if (user?.supabaseId) {
        const client = await supabaseAuth(cookieResponse);
        const { data, error } = await client.auth.getUser();
        if (error || data.user?.id !== user.supabaseId)
          throw new AppError("Google로 다시 로그인해주세요.", 401);
        applyRemoteProfile(user, data.user);
        for (const row of db.rows) {
          if (row.ownerId === user.id && "authorName" in row) {
            row.authorName = user.name;
            row.authorAvatar = user.avatar || "sun";
          }
        }
      }
      refreshReminders(db);
      return snapshot(db, user);
    });
    cookieResponse.headers.set("Cache-Control", "no-store");
    return NextResponse.json(payload, { headers: cookieResponse.headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  if (remoteEnabled()) return remoteApp(request);
  try {
    checkOrigin(request);
    const token = await sessionToken();
    const data = await request.json();
    const cookieResponse = new NextResponse();
    const payload = await transact(async (db) => {
      const user = needUser(currentUser(db, token));
      rateLimit(user.id);
      const result = act(db, user, data.action, data.input || {});
      if (
        user.supabaseId &&
        ["profile.update", "profile.region"].includes(data.action)
      )
        await persistRemoteProfile(await supabaseAuth(cookieResponse), user);
      return { result, ...snapshot(db, user) };
    });
    return NextResponse.json(payload, { headers: cookieResponse.headers });
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
