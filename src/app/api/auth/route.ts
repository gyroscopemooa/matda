import { NextResponse } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import { transact } from "@/lib/store";
import {
  checkOrigin,
  currentUser,
  hashToken,
  passwordHash,
  passwordMatches,
  rateLimit,
  sessionToken,
} from "@/lib/auth";
import { AppError, publicUser, required } from "@/lib/types";
export const runtime = "nodejs";
export async function GET() {
  const token = await sessionToken();
  return NextResponse.json(
    await transact((db) => ({
      user: currentUser(db, token) ? publicUser(currentUser(db, token)!) : null,
      mode: "local",
    })),
  );
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await request.json();
    rateLimit("auth:" + String(data.email || "logout").toLowerCase(), 12);
    const old = await sessionToken();
    const raw = randomBytes(32).toString("hex");
    const result = await transact((db) => {
      if (data.action === "logout") {
        db.sessions = db.sessions.filter(
          (s) => s.token !== hashToken(old || ""),
        );
        return null;
      }
      const email = required(data.email, "이메일", 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new AppError("이메일 형식을 확인해주세요.");
      const password = required(data.password, "비밀번호", 128);
      let user = db.users.find((u) => u.email === email);
      if (data.action === "signup") {
        if (user) throw new AppError("이미 가입한 이메일입니다.");
        if (password.length < 10)
          throw new AppError("비밀번호는 10자 이상 입력해주세요.");
        user = {
          id: randomUUID(),
          name: required(data.name, "이름", 40),
          email,
          password: passwordHash(password),
          role: data.role === "provider" ? "provider" : "customer",
          region: "",
          createdAt: new Date().toISOString(),
        };
        db.users.push(user);
      } else if (!user || !passwordMatches(password, user.password))
        throw new AppError("이메일 또는 비밀번호를 확인해주세요.", 401);
      if (user?.disabled) throw new AppError("이용이 제한된 계정입니다.", 403);
      db.sessions = db.sessions.filter(
        (s) => Date.parse(s.expiresAt) > Date.now(),
      );
      db.sessions.push({
        token: hashToken(raw),
        userId: user!.id,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      return publicUser(user!);
    });
    const response = NextResponse.json({ user: result });
    response.cookies.set("matda_session", result ? raw : "", {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: result ? 604800 : 0,
    });
    return response;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "로그인 실패" },
      { status: e instanceof AppError ? e.status : 500 },
    );
  }
}
