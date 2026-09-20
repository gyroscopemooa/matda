export type Guide = {
  autoPublished?: boolean;
  sections?: { heading: string; body: string }[];
  sources?: string[];
  slug: string;
  category: string;
  title: string;
  intro: string;
  checks: string[];
  template: string;
  updatedAt: string;
  author: string;
  status: "published" | "draft";
};
export const guides: Guide[] = [
  {
    slug: "cleaning-request",
    category: "청소·관리",
    title: "입주청소 요청 전, 작업 범위를 먼저 정리해요",
    intro:
      "같은 공간도 원하는 청소 범위에 따라 설명이 달라집니다. 면적뿐 아니라 상태와 제외할 작업을 함께 적어보세요.",
    checks: [
      "공간의 종류와 면적, 비어 있는지 짐이 있는지 적어요.",
      "주방·욕실·창틀 등 필요한 작업과 제외할 작업을 나눠요.",
      "오염된 곳은 전체 모습과 가까운 사진을 함께 준비해요.",
      "추가 작업이 생길 때 먼저 설명과 금액 확인을 요청해요.",
    ],
    template:
      "청소할 공간:\n면적과 현재 상태:\n필요한 작업:\n제외할 작업:\n희망 일정:",
    updatedAt: "2026-09-20",
    author: "해죠 운영팀",
    status: "published",
  },
  {
    slug: "moving-request",
    category: "이사·운송",
    title: "용달·이사 요청, 짐 사진과 이동 조건을 함께",
    intro:
      "짐의 양과 출발·도착 조건을 함께 알려주면 제공자가 작업 범위를 이해하기 쉽습니다.",
    checks: [
      "큰 가구와 가전의 종류·수량·대략적인 크기를 적어요.",
      "출발지와 도착지의 층수, 엘리베이터 여부를 적어요.",
      "포장·분해·조립 중 필요한 작업을 구분해요.",
      "주차와 운반 동선은 설명하되 공개 글에 상세주소는 쓰지 않아요.",
    ],
    template:
      "옮길 물건과 수량:\n출발/도착 지역:\n층수와 엘리베이터:\n포장·조립 필요 여부:\n희망 일정:",
    updatedAt: "2026-09-20",
    author: "해죠 운영팀",
    status: "published",
  },
  {
    slug: "repair-request",
    category: "수리·설치",
    title: "수리 요청은 증상과 발생 시점부터",
    intro: "원인을 미리 단정하기보다 관찰한 증상을 전달하는 요청 양식입니다.",
    checks: [
      "언제부터 어떤 증상이 나타났는지 적어요.",
      "제품명·모델명을 알고 있다면 함께 적어요.",
      "전체 모습과 문제가 보이는 부분을 사진으로 남겨요.",
      "방문 점검과 실제 수리의 범위·비용을 구분해 물어보세요.",
    ],
    template:
      "수리/설치 대상:\n증상과 발생 시점:\n제품명/모델명:\n이미 확인한 내용:\n희망 일정:",
    updatedAt: "2026-09-20",
    author: "해죠 운영팀",
    status: "published",
  },
  {
    slug: "interior-request",
    category: "공간·시공",
    title: "시공 견적을 비교하기 위한 작업 목록 만들기",
    intro: "비교할 작업 범위를 먼저 맞추는 데 쓰는 체크리스트입니다.",
    checks: [
      "방·벽·바닥 등 바꿀 부분을 구체적으로 나눠요.",
      "원하는 자재나 참고 사진을 준비하고 미정 항목은 미정이라고 적어요.",
      "철거·운반·폐기물 처리 등 포함 여부를 물어보세요.",
      "변경 작업은 진행 전에 범위와 금액을 다시 확인하도록 요청해요.",
    ],
    template:
      "시공할 공간과 면적:\n원하는 작업:\n자재/디자인 참고:\n포함 여부를 확인할 작업:\n희망 일정:",
    updatedAt: "2026-09-20",
    author: "해죠 운영팀",
    status: "published",
  },
  {
    slug: "car-request",
    category: "자동차",
    title: "자동차 작업 요청에 넣으면 좋은 정보",
    intro:
      "정비와 외관 작업을 구분하고 현재 상태와 원하는 결과를 설명해보세요.",
    checks: [
      "차종·연식과 작업하려는 부분을 적어요.",
      "증상이나 손상 부위를 구체적으로 설명해요.",
      "부품·공임·추가 점검의 포함 여부를 물어보세요.",
      "사진을 올릴 때 번호판과 개인 정보가 노출되지 않는지 확인해요.",
    ],
    template:
      "차종과 연식:\n요청할 작업:\n증상/현재 상태:\n확인하고 싶은 항목:\n방문 가능한 지역/일정:",
    updatedAt: "2026-09-20",
    author: "해죠 운영팀",
    status: "published",
  },
  {
    slug: "digital-request",
    category: "제작·디지털",
    title: "웹사이트 제작 요청, 필요한 화면부터 적어봐요",
    intro: "페이지 수만 적기보다 필요한 기능과 전달할 자료를 정리해보세요.",
    checks: [
      "사이트의 목적과 주로 사용할 사람을 설명해요.",
      "로그인·예약·결제 등 필요한 기능을 나열해요.",
      "디자인·문구·사진을 누가 준비하는지 구분해요.",
      "수정 횟수, 납품 자료, 유지관리 범위를 각각 물어보세요.",
    ],
    template:
      "제작 목적:\n필요한 화면과 기능:\n참고 사이트:\n제공할 자료:\n납품받을 자료/유지관리 문의:\n희망 일정:",
    updatedAt: "2026-09-20",
    author: "해죠 운영팀",
    status: "published",
  },
];
export const publishedGuides = guides.filter((g) => g.status === "published");
