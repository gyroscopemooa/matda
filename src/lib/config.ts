export const siteConfig = {
  name: "해죠",
  businessName: "MATDA BIZ",
  parent: "MATDA",
  tagline: "일상의 작은 요청, 더 나은 연결",
  defaultRegion: "",
};
export const releasePhase = Number(
  process.env.NEXT_PUBLIC_RELEASE_PHASE || "1",
);
export const flags = {
  quotes:
    releasePhase >= 2 && process.env.NEXT_PUBLIC_QUOTES_ENABLED !== "false",
  providers:
    releasePhase >= 3 && process.env.NEXT_PUBLIC_PROVIDERS_ENABLED !== "false",
  biz: releasePhase >= 4 && process.env.NEXT_PUBLIC_BIZ_ENABLED !== "false",
  tenders: process.env.TENDERS_ENABLED === "true",
  payments: false,
};
export const quotePolicy = {
  defaultLimit: 5,
  maxLimit: 10,
  defaultHours: 72,
  extensionHours: 24,
  maxExtensions: 2,
  maxHours: 120,
  activeLimit: 5,
  categoryActiveLimit: 2,
  requireAcceptance: process.env.QUOTE_REQUIRE_PROVIDER_ACCEPTANCE === "true",
};
export const categories = [
  "청소",
  "이사·운송",
  "수리·설치",
  "인테리어·시공",
  "자동차",
  "기타",
];
export const businessCategories = [
  "산업안전·보건",
  "전기·에너지",
  "소방·방재",
  "시설·건물관리",
  "환경·폐기물",
  "검사·인증·품질",
  "IT·기업운영",
  "경영지원·전문대행",
];
export const postTypes = {
  request: "해줘요",
  question: "질문",
  review: "후기",
  free: "자유",
} as const;

export function isReleasedPath(path: string) {
  return !(
    ((path === "/quotes" || path.startsWith("/quotes/")) && !flags.quotes) ||
    ((path === "/providers" || path.startsWith("/providers/")) &&
      !flags.providers) ||
    ((path === "/biz" || path.startsWith("/biz/")) && !flags.biz)
  );
}
