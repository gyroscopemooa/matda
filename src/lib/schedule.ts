import { AppError } from "./types";
export function parseSchedule(input: Record<string, unknown>) {
  const mode = String(
    input.scheduleMode || (input.desiredDate ? "date" : "flexible"),
  );
  if (!["flexible", "date", "range"].includes(mode))
    throw new AppError("일정 유형을 확인해주세요.");
  if (mode === "flexible")
    return { scheduleMode: mode, desiredDate: "", desiredEndDate: "" };
  const start = String(input.desiredDate || ""),
    end = mode === "range" ? String(input.desiredEndDate || "") : "";
  const valid = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  if (!valid(start) || (mode === "range" && !valid(end)))
    throw new AppError("희망 일정의 날짜를 선택해주세요.");
  if (end && end < start)
    throw new AppError("종료일은 시작일 이후로 선택해주세요.");
  return { scheduleMode: mode, desiredDate: start, desiredEndDate: end };
}
export function scheduleLabel(post: Record<string, unknown>) {
  if (post.scheduleMode === "range")
    return `${post.desiredDate} ~ ${post.desiredEndDate}`;
  return post.desiredDate ? String(post.desiredDate) : "협의 가능";
}
