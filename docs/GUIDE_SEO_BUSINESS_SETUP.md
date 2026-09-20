# 가이드 자동 초안 · 검색 · 사업자 커뮤니티 설정

## 현재 코드와 실제 실행의 구분

코드 구현: 관리자 편집실, OpenAI 초안 생성, 한국 날짜별 1개 저장, 최대 3회 시도, 공개 가이드 서버 렌더링/메타데이터/사이트맵, 사업자·업체 영역.
실제 자동 실행: 아래 SQL·Secret·스케줄러 배포를 마쳐야 시작된다. 로컬 테스트는 외부 AI 유료 호출을 하지 않는다.

## 1. Supabase SQL

기존 커뮤니티 DB의 SQL Editor에서 `supabase/migrations/0011_guides_business.sql` 전체 실행. 기존 글은 유지된다. 재실행 가능.
`0010_sample_posts.sql`은 이전 샘플 2개 등록용이며 0011과 별개다.
자동 운영 방식 선택은 `0013_guide_automation_modes.sql`도 실행한다. 기본값은 수동이며, 기존 글을 일괄 발행하지 않는다.
0011 적용 전에도 기존 개인 글 등록과 고정 가이드는 유지된다. 새 사업자 글 작성은 SQL 적용 후 사용한다.

## 2. 메인 Worker matda의 서버 Secrets

Cloudflare → Workers & Pages → matda → Settings → Variables and Secrets에서 추가한다. Build variables만 등록하면 안 된다.

| 종류 | 이름 | 값 |
|---|---|---|
| Secret | OPENAI_API_KEY | 본인의 OpenAI API 프로젝트 키 |
| Secret | SUPABASE_SERVICE_ROLE_KEY | 해당 Supabase 프로젝트 서버용 service_role 키 또는 서버 Secret key |
| Secret | GUIDE_CRON_SECRET | 임의의 긴 난수 32자 이상. 기존 matda에만 등록 |
| 선택 Text | OPENAI_GUIDE_MODEL | 기본 gpt-4o-mini. 계정에서 사용 가능한 모델로 변경 가능 |

이 값들은 NEXT_PUBLIC 접두사를 붙이거나 브라우저/채팅/저장소에 올리지 않는다. ChatGPT 구독과 API 이용은 별개이므로 API 프로젝트 결제·사용량 설정을 확인한다.
관리자 Google 계정으로 matda.net/admin 접속 → 가이드 편집실 → 오늘 초안 생성. 성공하면 초안만 저장된다. 같은 날 다시 눌러도 새 글을 중복 생성하지 않는다.

## 3. 기존 matda Worker에서 매일 예약 실행

새 Worker를 만들지 않는다. `workers/matda.mjs`가 OpenNext의 기존 요청 처리를 유지하면서 scheduled 핸들러를 추가한다.
기존 Git 빌드/배포 명령(`npm run cf:build`, `npm run cf:deploy`)은 그대로다.
`wrangler.jsonc`의 Cron이 배포 시 함께 적용된다.

기존 **matda** → Settings → Variables and Secrets에 Text `GUIDE_AUTOMATION_ENABLED=true`를 추가한다.
`GUIDE_CRON_SECRET`과 OpenAI/Supabase Secrets도 기존 matda에만 둔다. 중단하려면 활성화 값을 false로 바꾼다.
관리자에서 수동/매일 초안/일반 팁 자동 발행을 선택한다. 기본값 수동에서는 예약이 와도 AI를 호출하지 않는다.
keep_vars로 대시보드 환경변수를 유지하며, 이미 있는 WORKER_SELF_REFERENCE 바인딩으로 앱 API를 호출한다.

한국 시간 매일 09:00 시도, 실패 시 09:20·09:40 재시도. 성공한 날은 추가 AI 호출 없이 건너뛴다. 날짜별 최대 3회, 동시에 실행되어도 DB에서 한 작업만 확보한다. 오류는 편집실 최근 생성 기록 및 Worker Logs에서 확인한다.

## 4. 수동·자동 운영 방식

관리자 → 가이드 편집실 → 자동화 방식 → 저장:

- **수동**: 예약 요청은 건너뛴다. 버튼으로 초안 생성, 직접 발행.
- **매일 초안**: 한국 시간 오전 9시에 초안 생성, 직접 검수 후 발행.
- **일반 팁 자동 발행**: 예약 생성한 일반 정보는 자동 발행. 계약·법률·금액·안전 관련 키워드 또는 전문 분야가 포함되면 초안으로 남김. 이 필터는 사실 검증기가 아니며 운영자의 사후 확인이 필요하다.

어느 모드든 수동 생성 버튼은 항상 초안만 만든다. 하루 1개 제한은 수동·자동 합산이다. 이미 만든 오늘 글을 설정 변경만으로 공개하지 않는다. 자동 글도 편집/보류 가능하며 자동 작성 표시가 나온다. 사람의 검수 완료 기록으로 위장하지 않는다.
스케줄러 활성화와 관리자 운영 방식 둘 다 맞아야 매일 실행된다. 모델은 메인 Worker의 OPENAI_GUIDE_MODEL 또는 기본 gpt-4o-mini 사용.

## 5. 검수·발행

제목·소개·본문·체크리스트·요청 양식을 수정하고, 검증한 HTTPS 출처를 추가한다. AI는 실시간 자료를 검색하지 않으므로 최신 가격·법률·안전 기준을 확인했다고 간주하면 안 된다. 계약금 비율을 정답처럼 안내하지 않는다.
검수 완료 체크 → 발행. 공개 목록/상세와 사이트맵에 반영된다. 보류/초안으로 바꾸면 공개에서 빠진다. 발행 글 수정 중 '초안 저장'은 기존 발행도 해제한다.
기존 고정 운영팀 가이드는 코드 콘텐츠이며 편집실의 AI 초안 목록과 구분된다.

## 6. 검색 등록

메인 배포 설정의 SEARCH_INDEXING_ENABLED=true일 때 홈과 공개 가이드만 index 허용. 로컬 기본은 차단. 채팅·MY·관리자·일반 글 목록은 이번 범위에서 검색 노출하지 않는다.

1. Google Search Console에서 matda.net 소유권 확인. DNS 방식 또는 GOOGLE_SITE_VERIFICATION 환경변수의 메타 코드 사용.
2. 네이버 서치어드바이저에 https://matda.net 등록. NAVER_SITE_VERIFICATION 환경변수에 메타 태그 content 값만 넣고 배포.
3. 두 서비스에 https://matda.net/sitemap.xml 제출.
4. https://matda.net/robots.txt 확인하고 공개 가이드 URL 검사/수집 요청.

공식 사이트명은 해죠. 홈 제목은 `해죠 | 필요한 일이 있나요? 일단 올려죠.`로 고정한다. 공유 이미지는 기존 해죠 브랜드 이미지 공통 사용. 검색 등록은 노출/순위 보장을 뜻하지 않는다.

## 7. 사업자 커뮤니티와 향후 BIZ

커뮤니티 전체/생활·개인/사업자·업체 필터. 기존 서비스 분야를 함께 사용하고 산업안전·전기·소방·시설(승강기)·환경·검사·기업운영 분야 추가.
사업자 영역에서 업체 구함·질문·후기·자유·업체 소개 작성. 업체 소개는 기본 피드/인기글에서 제외하고 전용 탭에서 조회한다. 소개 등록이 인증을 의미하지 않는다.
community_sector/community_purpose는 커뮤니티 분류만 관리한다. 기존 audience=business의 조직·RFQ 접근권한과 분리해 기존 권한을 유지한다. 정식 견적·조직 결재·RFQ 전환은 아직 활성화하지 않았다.

## 참고한 공식 문서

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.google.com/search/docs/appearance/site-names
