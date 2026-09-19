export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://matda.net"
).replace(/\/$/, "");
export const searchEnabled = () =>
  process.env.SEARCH_INDEXING_ENABLED === "true";
export const homeTitle = "해죠 | 필요한 일이 있나요? 일단 올려죠.";
export const homeDescription =
  "해죠, 해줘, 해주세요. 청소부터 웹·앱 제작, 사업장 관리까지 필요한 일을 묻고 맡길 사람을 찾는 곳. 해죠 가이드에서 업체 선정과 요청 준비 노하우도 확인하세요.";
