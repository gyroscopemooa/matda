export const siteConfig = {
  name: "해죠",
  businessName: "MATDA BIZ",
  parent: "MATDA",
  tagline: "필요한 일에서 시작되는 연결",
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
  "청소·관리",
  "이사·운송",
  "수리·설치",
  "공간·시공",
  "자동차",
  "제작·디지털",
  "기타",
];
const categoryAliases: Record<string, string> = {
  청소: "청소·관리",
  "인테리어·시공": "공간·시공",
};
export const normalizeCategory = (value: string) =>
  categoryAliases[value] || value;
export const categoryExamples: Record<string, string> = {
  "청소·관리": "입주·이사청소, 에어컨청소, 정리수납, 방역",
  "이사·운송": "포장이사, 용달, 화물, 가구 운송, 차량 탁송",
  "수리·설치": "누수, 전기, 보일러, 에어컨·가전, 도어락",
  "공간·시공": "인테리어, 도배·장판, 욕실·타일, 페인트, 철거",
  자동차: "정비, 판금·도색, 썬팅, 블랙박스, 디테일링",
  "제작·디지털": "웹·앱 개발, 디자인, 로고·상세페이지, 촬영·영상편집",
  기타: "분류에 없는 맡기고 싶은 일",
};
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
