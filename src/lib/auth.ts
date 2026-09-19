import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { cookies } from "next/headers";
import type { Database, User } from "./types";
import { AppError } from "./types";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const passwordHash = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
export function passwordMatches(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function sessionToken() {
  return (await cookies()).get("matda_session")?.value;
}
export function currentUser(db: Database, token?: string): User | undefined {
  if (!token) return;
  const session = db.sessions.find(
    (s) => s.token === hashToken(token) && Date.parse(s.expiresAt) > Date.now(),
  );
  return db.users.find((u) => u.id === session?.userId && !u.disabled);
}
export function needUser(user?: User): User {
  if (!user) throw new AppError("로그인 후 이용해주세요.", 401);
  return user;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host"))
    throw new AppError("허용되지 않은 요청입니다.", 403);
}
const limits = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max = 60) {
  const now = Date.now();
  if (limits.size > 10000)
    for (const [k, v] of limits) if (v.until < now) limits.delete(k);
  const entry = limits.get(key);
  if (entry && entry.until > now) {
    if (entry.count >= max)
      throw new AppError("요청이 많습니다. 잠시 후 다시 시도해주세요.", 429);
    entry.count++;
  } else limits.set(key, { count: 1, until: now + 60000 });
}
