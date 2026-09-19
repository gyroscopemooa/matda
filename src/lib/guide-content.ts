import { AppError } from "./types";
export type GuideContent = {
  title: string;
  category: string;
  intro: string;
  sections: { heading: string; body: string }[];
  checks: string[];
  template: string;
  sources: string[];
  reviewNotes: string;
};
export const guideTopics = [
  ["청소·관리", "입주청소 작업 범위를 설명하는 사진 준비"],
  ["제작·디지털", "작은 가게 홈페이지 외주 요청서 작성"],
  ["이사·운송", "사무실 이전 전 짐과 운반 동선 정리"],
  ["수리·설치", "수리 방문 전 증상 기록과 질문 준비"],
  ["공간·시공", "매장 인테리어 견적의 포함·제외 작업 비교"],
  ["자동차", "자동차 작업 견적서 항목을 비교하는 방법"],
  ["시설·건물관리", "승강기 유지보수 업체에 물어볼 서비스 범위"],
  ["산업안전·보건", "안전관리 대행 상담 전 사업장 자료 정리"],
  ["전기·에너지", "전기 관리 업체 상담 전 시설 정보 정리"],
  ["청소·관리", "정기 사무실 청소의 작업 체크리스트"],
  ["제작·디지털", "제품 촬영 의뢰 전 준비할 자료"],
  ["공간·시공", "추가 작업과 비용을 서면으로 확인하는 질문"],
  ["기타", "계약금·중도금·잔금 조건을 협의할 때 확인할 사항"],
  ["기타", "작업 범위 분쟁을 줄이는 기록 정리 습관"],
] as const;
export const koreanDay = (date = new Date()) =>
  new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10);
export function validateGuide(value: unknown): GuideContent {
  const v = value as GuideContent;
  const text = (s: unknown, max: number) =>
    typeof s === "string" && !!s.trim() && s.length <= max;
  if (
    !v ||
    !text(v.title, 120) ||
    !text(v.category, 80) ||
    !text(v.intro, 500) ||
    !text(v.template, 4000) ||
    !Array.isArray(v.sections) ||
    v.sections.length < 2 ||
    v.sections.length > 8 ||
    v.sections.some((s) => !text(s.heading, 120) || !text(s.body, 4000)) ||
    !Array.isArray(v.checks) ||
    v.checks.length < 3 ||
    v.checks.length > 12 ||
    v.checks.some((s) => !text(s, 500)) ||
    !Array.isArray(v.sources) ||
    v.sources.length > 10 ||
    v.sources.some(
      (s) =>
        typeof s !== "string" ||
        !/^https:\/\/[^\s]+$/.test(s) ||
        s.length > 1000,
    ) ||
    typeof v.reviewNotes !== "string" ||
    v.reviewNotes.length > 3000
  )
    throw new AppError("글의 제목·본문·체크리스트 형식을 확인해주세요.");
  return {
    title: v.title,
    category: v.category,
    intro: v.intro,
    sections: v.sections,
    checks: v.checks,
    template: v.template,
    sources: v.sources,
    reviewNotes: v.reviewNotes,
  };
}
