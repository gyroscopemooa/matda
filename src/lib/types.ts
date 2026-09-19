export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "customer" | "provider" | "admin";
  region: string;
  createdAt: string;
  disabled?: boolean;
};
export type Row = {
  id: string;
  ownerId: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};
export type Database = {
  users: User[];
  sessions: { token: string; userId: string; expiresAt: string }[];
  rows: Row[];
};
export type PublicUser = Omit<User, "password">;
export const publicUser = (user: User): PublicUser => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    region: user.region,
    createdAt: user.createdAt,
    disabled: user.disabled,
  };
};
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function required(value: unknown, label: string, max = 5000): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new AppError(`${label}을(를) 확인해주세요.`);
  return value.trim();
}
export function money(value: unknown): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 1_000_000_000_000)
    throw new AppError("올바른 정수 금액을 입력해주세요.");
  return number;
}
export const iso = (value: unknown): string => {
  const d = new Date(String(value));
  if (!Number.isFinite(d.getTime())) throw new AppError("날짜를 확인해주세요.");
  return d.toISOString();
};
