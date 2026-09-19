import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { transact } from "@/lib/store";
import { hashToken, passwordHash } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const target = new URL("/", request.url);
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    target.searchParams.set("auth", "google-failed");
    return NextResponse.redirect(target);
  }
  const response = NextResponse.redirect(target);
  try {
    const supabase = await supabaseAuth(response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const identity = data.user;
    if (error || !identity?.email || !identity.email_confirmed_at)
      throw error || new Error("인증된 이메일이 필요합니다.");

    const raw = randomBytes(32).toString("hex");
    await transact((db) => {
      const email = identity.email!.toLowerCase();
      let user = db.users.find((candidate) => candidate.email === email);
      if (!user) {
        const name =
          String(
            identity.user_metadata.full_name ||
              identity.user_metadata.name ||
              email.split("@")[0],
          )
            .trim()
            .slice(0, 40) || "새 이웃";
        user = {
          id: identity.id,
          name,
          email,
          password: passwordHash(randomBytes(32).toString("hex")),
          role: "customer",
          region: "",
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
      }
      if (user.disabled) throw new Error("이용이 제한된 계정입니다.");
      db.sessions = db.sessions.filter(
        (session) => Date.parse(session.expiresAt) > Date.now(),
      );
      db.sessions.push({
        token: hashToken(raw),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
    });
    response.cookies.set("matda_session", raw, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 604800,
    });
    return response;
  } catch {
    target.searchParams.set("auth", "google-failed");
    return NextResponse.redirect(target, { headers: response.headers });
  }
}
