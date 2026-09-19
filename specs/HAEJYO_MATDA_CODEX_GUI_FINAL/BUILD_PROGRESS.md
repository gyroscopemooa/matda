# BUILD PROGRESS

최종 갱신: 2026-09-20 (Asia/Seoul)

## 최신 — 해죠 가이드
- Phase 1 헤더에 해죠 가이드 추가. 운영팀 요청 준비 글 6개, 분야별 필터/검색, 체크리스트, 양식·링크 복사, 관련 글 구현.
- 요청 CTA는 카테고리/양식을 채우고 제작·디지털은 온라인 기본값. 비회원 로그인/가입 후 선택한 양식 이어쓰기.
- 제목/설명 메타데이터, 미공개 경로 차단. 검색 noindex 유지; 검색 유입 활성화는 배포 후 별도.
- 가이드→가입→템플릿→글 등록 E2E, PC1440/모바일390 화면 검증 통과. 타입/린트/production build 통과.
- 현재 콘텐츠는 코드로 관리. AI 생성 API, 관리자 초안함/검토·예약 발행은 미구현이며 일일 자동 발행 없음. 업체 모집/외부 연락/응답 보장/후기 자동생성은 시행하지 않음.

## 최신 — 알림/받은 채팅 진입 수정
- 헤더 종 클릭 시 최근 알림 팝오버. 댓글 알림은 글 댓글 영역, 메시지는 해당 채팅으로 이동하며 읽음 처리한다. 전체 알림 화면도 같은 동작.
- MY 나의 대화 통계를 실제 링크로 수정. 채팅 목록에 상대 이름/제목2줄/최근 메시지, 채팅 상단에 상대 이름/원문 링크2줄 표시. 미선택 시 안내 제공.
- 서로 다른 두 계정으로 작성자 수신→MY 진입→답장→상대 수신, 종 팝오버→댓글/채팅 이동 E2E 통과. PC1440/모바일390 가로넘침 없음. 타입검사 통과. 실서비스 원격 연결 검증은 별도.

## 최신 — 소개 문구 순환
- 현재 소개·이전 이웃 소개·“해죠 해줘 해주세요”·“누가 좀 해죠… 해죠에 말해죠!” 4세트를 새로고침마다 순서대로 표시한다. 영어/제목/설명이 함께 바뀐다. 문서 내 페이지 이동은 같은 문구를 유지한다.
- 까투리체와 기존 캐릭터 유지. 브라우저 저장소를 사용할 수 없으면 첫 문구 표시. FIXED_CANDIDATE로 추후 고정 가능.
- Edge에서 1→2→3→4→1 순환, 커뮤니티 이동 시 유지, 모바일390 가로넘침 없음 확인. 린트 통과.

## 최신 — 요청형 커뮤니티 카테고리 개편
- 6+기타: 청소·관리, 이사·운송, 수리·설치, 공간·시공, 자동차, 제작·디지털, 기타. 글쓰기 예시와 PC/모바일 탐색에 반영했다.
- 기존 청소/인테리어·시공 글은 새 분류로 호환한다. 최소 금액 제한은 추가하지 않았다.
- 글쓰기에서 지역 서비스 / 전국·온라인 가능 선택. 온라인 요청은 주소 없이 저장하고, 온라인 필터는 선택 지역과 관계없이 표시한다. 로컬 요청은 시도 전체 선택을 유지한다.
- 소개 문구: “필요한 일이 있나요? 일단 올려죠.” Phase 1의 글/댓글 중심 흐름과 후속 메뉴 숨김을 유지한다.
- 단위/DB 28개, 관련 E2E 6개 통과(기존 문구/누적 테스트 데이터 선택자를 수정 후 재검증). PC1440/모바일390 가로넘침, 온라인 작성·수정·필터·새로고침 확인. 타입/린트 통과.
- 원격 DB migration 0006과 통합 업그레이드 SQL 준비. 실제 Supabase 적용/공개 출시는 아직 완료되지 않았다.

## 최신 UI 보완 — 글 상세·목록 사진·지역 전체
- 후속 사용자 수정: 상세 사진은 동일한 정사각형 썸네일 그리드(PC 3열/모바일 2열)로 변경. 클릭 시 저장된 원본 비율 이미지 새 탭 열기를 유지한다. PC1440/모바일390 정사각형 크기와 기존 지역/클릭 E2E 재검증 통과.
- 상세 상단 왼쪽 글종류/지역, 오른쪽 아바타/닉네임/작성일. 제목 → 원본 비율 큰 사진 → 본문 → 일정/액션 순으로 분리했다.
- 목록은 왼쪽 제목/본문, 오른쪽 첫 사진(PC 160px/모바일 108px), 그 아래 추가 사진 썸네일. 사진 클릭은 저장된 이미지 파일을 새 탭으로 연다. 업로드 시 압축 전 원본을 별도로 저장하는 기능은 아니다.
- 목록/상세 제목 표시를 최대 2줄로 제한. 원문 데이터는 유지한다.
- 글쓰기/프로필 지역은 시도 범위도 허용한다. 시군구의 '울산광역시 전체', 읍면동의 '남구 전체' 선택을 제공하며 시도 변경 시 하위 선택을 초기화한다. 글쓰기는 시도만 필수. 잘못된 지역 조합은 계속 거절한다.
- 검증: 단위/DB 27개, 관련 Edge E2E 7개, 타입/린트 통과. PC1440/모바일390 사진 비율·좌우 배치·제목2줄·가로넘침·사진 새탭·시도/구 전체 저장 확인. 테스트 데이터로 찍은 스크린샷은 docs/post-card-*.png, docs/post-detail-*.png (Git 제외).
- 저장 파일/압축 방식/용량은 변경하지 않았다. 실제 공개 연결의 미완료 상태도 유지한다.

현재 공개 단계: **Phase 1 — 커뮤니티만 노출**. 후속 Phase 구현은 코드에 보존.
이전 55/55 및 100% 표시는 대표 흐름 위주의 기록으로, 지역 계층 선택 누락을 반영하지 못했다. 전체 완성률로 사용하지 않는다. 현재 공개 범위는 Phase 1이며 기능별 검증 근거로 관리한다.
공개 출시: **미완료**. 외부 어댑터 개발·서비스 연결·staging 검증은 별도이며 아래 완료 체크에 포함하지 않는다.

## 최신 — 7개 출시 준비 항목 일괄 진행

사용자 테스트는 마지막으로 미루고 구현·자동 검증을 진행했다. 실제 연결과 검증이 남아 있어 임의의 완료 퍼센트를 계산하지 않는다.

|항목|이번 작업|남은 실제 연결|
|---|---|---|
|1 프로필|닉네임·지역·기본 아바타 3종·내 사진, 업로드/새로고침 E2E 통과|원격 다른 기기 확인|
|2 회원/세션|Supabase JWT → public.profiles, 역할은 관리자 테이블로만 부여|SQL 0004 적용|
|3 이메일|가입·인증 콜백·비밀번호 재설정 요청/변경/만료 안내|SMTP·메일 템플릿·실수신|
|4 사진|R2 공개 이미지 adapter, metadata RLS, 실패 시 정리|R2 자격증명/공개 도메인|
|5 글/댓글|정규화 DB mapper·CRUD·사진5장·기간 종료일 보존|SQL 적용 후 원격 저장 확인|
|6 채팅/알림|참여자 RPC/RLS·차단·읽음·DB 알림 trigger·Realtime 및 폴링 복구|SQL 0005·두 계정 실수신|
|7 운영/배포|신고·숨김·계정 제한·audit SQL, CI, 읽기전용 preflight, 배포 안내|관리자 로그인·호스팅/DNS·운영 정책·최종 검증|

- 자동 검증: 단위/DB 27개 통과. Edge E2E 전체 17개 중 16개 통과 후, 변경된 가입 필드 라벨을 테스트에서도 닉네임으로 맞춰 해당 파일 2개 재실행 통과. 새 프로필 사진/복구 화면 테스트 포함. 린트/타입검사 통과, Next 16.3.5 production build 성공.
- Next 16.3.1의 npm audit critical 취약점을 16.3.5로 패치. 설치 후 audit 0건. 미리보기/테스트 서버도 패치 버전으로 재시작했다.
- 읽기전용 원격 점검: profiles/posts/comments/media의 새 컬럼 모두 42703(미적용), R2 변수 5개 없음. Supabase 관리 화면은 로그인 필요. 따라서 local 미리보기를 원격으로 강제 전환하지 않았다.
- 실행 파일: `supabase/UPGRADE_COMMUNITY.sql` (0001~0003 이후 한 번), `npm run check:remote`. 안내: `docs/COMMUNITY_LAUNCH.md`.
- 공개 UI는 계속 Phase 1. 신규 브랜드/모바일 캐릭터/까투리체 유지. 실제 SMTP/R2/Realtime 연결·부하·공개 출시 통과는 주장하지 않는다.

아래 내용은 이전 단계의 이력이다. 원격 adapter 미구현이라는 과거 문구는 위 최신 상태로 대체한다.

## 2026-09-20 — Supabase Google OAuth 시작 연결

- Google 회원 프로필 1차 원격 연결: `auth.users.user_metadata.haejyo_profile`에 닉네임·기본 지역·기본 아바타를 저장한다. 로그인 및 앱 로딩 시 원격값을 읽고 프로필 저장 실패 시 로컬 변경도 커밋하지 않는다. 권한은 메타데이터로 변경하지 않는다. 기존 로그인 계정은 재로그인으로 연결한다. `public.profiles` 테이블 전환·이메일 가입·사진 Storage 전환은 미완료. 실제 사용자 원격 저장/다른 기기 검증은 재로그인 후 확인 필요.

- 사용자 제공 브랜드 이미지 6종과 컨셉샷의 로고 부분을 WebP 후보 7종으로 구성. 헤더 홈 링크에서 새로고침마다 1→7 순환하며 같은 문서 내 페이지 이동에서는 유지한다. `rotating-brand.tsx`의 FIXED_CANDIDATE로 나중에 고정 가능.

- 프로필 이미지 업로드 추가: JPG/PNG/WebP 최대 5MB, 512px 중앙 정사각형 변환, 미리보기 및 기본 아바타 복귀. 서버는 본인 소유 공개 이미지에만 프로필 연결을 허용한다. 사진 저장은 아직 로컬 미리보기 저장소다. MY 닉네임과 프로필 이미지 제목에 안동엄마까투리체 웹폰트를 적용했다.

- MY 프로필 수정: 닉네임·기본 지역·햇살/새싹/미소 아바타 3종을 로컬 계정에 저장. 기존 작성 글·댓글의 표시 이름에도 반영. 이메일 가입은 로컬 방식이며 이메일 인증/재설정 및 Supabase 이메일 회원가입 전환은 미완료.

- 콜백 실패 로그의 `AuthRetryableFetchError`를 조사해 제한 환경의 Node 외부 통신이 `EACCES`로 차단되는 것을 확인했다. 3107 미리보기 서버를 외부 연결 가능한 권한으로 재시작했다. OAuth 버튼은 RSC 요청을 발생시키는 Link 대신 문서 이동을 사용하며, 콜백 복귀 주소도 설정된 사이트 origin으로 통일했다. 실제 Google 로그인 완료는 사용자 재시도 확인 대기.

- 사용자 생성 Supabase 프로젝트에 공개키 기반 Auth 연결을 추가했다. Google Provider 활성화와 `127.0.0.1:3107/auth/callback` 허용 주소는 사용자 설정으로 확인했다.
- `/auth/google`은 Supabase PKCE OAuth 시작 주소와 code-verifier 쿠키를 만들고, `/auth/callback`은 인증된 Google 이메일을 현재 로컬 개발 계정과 연결한다.
- 이 단계는 게시글·댓글·채팅의 Supabase DB 저장 전환이 아니다. 앱의 거래 데이터는 여전히 local adapter이며, 실제 서비스 출시 조건은 충족하지 않았다.
- 검증: OAuth 시작 E2E 통과, lint/typecheck/build 통과. 실제 Google 계정 선택과 콜백은 사용자 브라우저에서 최종 확인 필요.
- `localhost`와 `127.0.0.1`의 host-only PKCE 쿠키 충돌을 방지하기 위해 OAuth 시작을 설정된 `NEXT_PUBLIC_SITE_URL` 호스트로 먼저 정규화했다. 로컬 두 주소의 redirect 동작과 127.0.0.1 OAuth URL 생성을 재확인했다.

## 완료 판정 범위
별도 첨부 MASTER_PROMPT.md의 mock/feature flag 허용 원칙을 적용했다. 체크 표시는 로컬 구현과 자동화된 대표 흐름 검증을 의미한다. 각 화면의 모든 입력 조합, 모든 브라우저, 실제 외부 서비스까지 전수 검증했다는 뜻은 아니다. 단계별 10가지 상태 검증 근거와 한계는 docs/QA_REPORT.md에 기록했다.
브랜드: 해죠 / MATDA BIZ (작업명). 기존 코드가 없는 작업 폴더에서 구축. Git 저장소/커밋은 없음.

## 검증 결과
- npm test: 17/17 통과. 도메인, 권한, 마감 경계, 환경, 원장, 실제 PGlite SQL/RLS 실행.
- npm run test:e2e: 9/9 통과 (46.0초). 설치된 Edge, 격리 데이터, 단일 워커.
- npm run lint: 오류/경고 없이 통과. npm run typecheck: 통과.
- npm run build: 성공. TypeScript 검사 포함, 모든 라우트 생성.
- 모바일 360/390px, 태블릿 768px, PC 1440px 검증. 원본 디자인 5개 이미지 확인 후 같은 토큰/카드/내비게이션 유지.
- 최종 회귀: 업무문서 공개 업로드 거절, 사진 압축/저장, 템플릿 재사용, 비교견적, 계약/입찰, 관리자 검증.

## Phase Checklist
### Phase 0 Foundation
- [x] Repo/stack audit
- [x] Design tokens
- [x] Base responsive layout
- [x] Auth foundation
- [x] DB migration/RLS foundation
- [x] Brand config
- [x] Feature flags

### Phase 1 Community
- [x] Feed
- [x] Post CRUD
- [x] Categories/region
- [x] Image upload
- [x] Comments
- [x] Chat
- [x] MY
- [x] Report/block

### Phase 2 Consumer Quote
- [x] quote enabled request
- [x] quote policy 5/10/72h
- [x] provider quote
- [x] quote templates
- [x] compare
- [x] select
- [x] contact unlock
- [x] trade confirm
- [x] review

### Phase 3 Provider
- [x] provider profile
- [x] portfolio
- [x] provider search
- [x] verification
- [x] provider MY

### Phase 4 BIZ
- [x] organization
- [x] /biz home
- [x] B2B categories
- [x] business request
- [x] B2B quote

### Phase 5 RFQ / Contract
- [x] RFQ
- [x] proposal
- [x] workplace
- [x] contract
- [x] reminders

### Phase 6 Tender
- [x] tender draft/publish
- [x] sealed bid
- [x] deadline
- [x] bid versions
- [x] opening
- [x] evaluation/award
- [x] audit log

### Phase 7 Operations
- [x] admin
- [x] moderation
- [x] analytics
- [x] SEO
- [x] security hardening

### Phase 8 Payment/Settlement
- [x] payment feature flag
- [x] ledger schema
- [x] provider adapter
- [x] refund/reconciliation design

## 외부 서비스 및 남은 작업
- Supabase: 연결 안 됨. SQL migration/RLS는 PGlite에서 검증. Auth/SSR·정규화 repository·나머지 CRUD RPC·Realtime 어댑터 개발과 원격 검증 필요.
- Cloudflare: DNS/R2/Turnstile 연결 안 됨. 로컬 파일+사용자 결합 서명 링크로 비공개 정책 검증. 실제 R2/Turnstile 어댑터 구현 필요.
- 결제: 항상 비활성. mock adapter/정수 원장/환불 멱등성/대사만 검증. 실제 PG/지급 없음.
- 로컬 서버: 단일 프로세스 JSON 저장. 분산 DB, 백업/복구, 실부하 검증 완료 아님.
- 채팅: 5초 폴링. 계약/마감 알림은 API 조회 시 생성. 예약 실행·외부 발송 없음.
- Phase 7: 관리자·모더레이션·이벤트 집계·metadata·기초 보안 완료. 종합 보안감사/실서비스 SEO 성과를 의미하지 않음. 미리보기 noindex.
- Phase 9: manifest·공통 타입·반응형 준비. 오프라인/푸시/네이티브 앱은 후속 범위.
- 정확한 활성화 작업: docs/ACTIVATION_CHECKLIST.md. 환경변수만 넣으면 연결되는 상태가 아님.

## 실행 및 결과물
- npm install 후 npm run preview → http://127.0.0.1:3107
- preview 데이터: .local/preview. E2E 테스트와 분리.
- 실행/관리자/검증 안내: README.md
- QA 근거: docs/QA_REPORT.md, tests/, playwright-report/index.html
- DB: supabase/migrations/0001_foundation.sql, 0002_transactional_rpc.sql
- UI: docs/desktop-home.png, mobile-home.png, desktop-biz.png, contracts.png, mobile-tender.png, admin.png

## 다음 단계
공개 서비스 작업은 활성화 체크리스트 순서로 원격 어댑터를 개발하고 별도 staging 프로젝트에서 검증한다. 로컬 개발 단계의 완료와 공개 출시 통과를 혼동하지 않는다. 다운로드 원본은 보존했고 이 문서는 작업 폴더의 기준문서 사본에도 동기화했다.

## 2026-09-20 공개 단계 수정
사용자 지시에 따라 개발 단계와 UI 공개 단계를 분리했다. 기본 Phase 1에서 헤더/모바일 메뉴, 홈 배너, 견적 입력/배지, 업체/기업 MY 진입점을 숨기고 /quotes, /providers, /biz 직접 접근을 차단한다. Phase 2/3/4에서 순서대로 승격한다. PC/모바일·MY·글쓰기·직접 접근 브라우저 검증 통과. 기존 55개 체크는 내부 구현 이력이며 현재 공개 기능 목록이 아니다.

2026-09-20 Phase 공개 수정 검증: 기본 Phase 1 PC/모바일·MY·글쓰기·직접주소 제한 통과. 별도 Phase 8 전체 E2E 9/9 통과(32.8초), 도메인/DB 17/17 통과, lint/typecheck 통과. Phase 1 캡처: docs/phase1-390.png, docs/phase1-1440.png.

## 2026-09-20 — 글쓰기·커뮤니티 지역 분류 보완
- 지역 기능을 다음 Phase로 미루지 않고 Phase 1 범위로 구현했다. 기존 100% 완료 안내는 지역 계층 선택 누락으로 부정확했음을 정정한다.
- 시/도 → 시/군/구 → 읍/면/동(선택) 공통 선택기. 세종과 시 산하 일반구 처리. 자유입력 대신 유효 조합을 서버에서도 검증.
- 전국/광역/구/동 범위 필터와 카테고리·검색·글종류를 함께 적용. 비로그인 사용 가능, 브라우저 선택 유지.
- 글쓰기 초기 지역은 현재 필터 또는 MY 기본 지역. 신규 가입의 서울 강남구 고정값 제거, MY 기본 지역 설정 추가.
- 과거 축약 지역명은 필터에서 호환. 불완전한 기존 지역의 동을 임의로 추정하지 않는다.
- 데이터는 제공자 설명상 2026-02 법정동 스냅샷. 2026-09 현재 실시간 최신 목록이라고 주장하지 않는다. 출처/갱신은 docs/REGIONS.md.
- 검증: unit/DB 18개 통과. 기존 E2E 9개 통과. 로그인 없이 지역 선택하는 문제 수정 후 신규 지역 E2E 별도 재실행 통과. 타입검사/린트 통과. 모바일 캡처 확인.

## 지역 UI 위치 및 순차 선택 보완
- 사용자 표시 위치에 따라 검색창 위에 현재 지역/지역변경/전체 지역 보기 추가. 헤더와 같은 선택값 사용.
- 글쓰기와 필터 공통 선택기는 시도 선택 후 시군구, 시군구 선택 후 읍면동을 표시. 세종은 읍면동으로 바로 연결.
- 모바일390/PC1440 브라우저에서 노출 순서, 선택 반영, 가로 넘침 검증 통과. 타입검사 통과.
- 카테고리 문서의 초기6개 및 수요에 따른 기타 승격 원칙 확인. 방역/심부름 분류는 의견 제안이며 아직 카테고리 변경 결정이나 구현은 아님.

## 희망 일정 선택 개선
- 사용자 승인에 따라 협의 가능(기본)/날짜 지정/기간 지정으로 구성. 날짜 지정 시 하루, 기간 지정 시 시작일/종료일 입력. 시간대 설명은 본문 사용.
- 일정 없이 그냥 등록 유지. 서버는 날짜 유효성과 기간 순서 검증. 협의 가능 전환 시 이전 날짜 제거. 기존 단일 desiredDate는 날짜 지정으로 호환.
- 글 상세 일정 표시, 수정 폼 복원 및 새로고침 지속성 확인. 로컬 Row 저장 확장으로 실행하며 원격 Supabase repository/schema 연결은 기존 미완료 범위에 남음.
- 사진은 글당 최대 5장 유지(UI와 서버 제한).
- 검증: 단위/DB 19개 통과, 커뮤니티/일정 브라우저 3개 통과, 타입검사 통과.

## 인기글 및 글 종류 확장
- 사용자 승인: 소개 아래/지역 선택 위에 우리 동네 인기글·이번 주 최대 3줄. 선택 지역 기준, 일반 피드는 최신순 유지. 조건 미충족 시 숨김.
- 최근 7일 게시글 중 최근 7일 서로 다른 타인 댓글 작성자 2명 이상인 글을 순위화. 본인/숨김/삭제 댓글 제외, 반복 댓글은 순위 점수 중복 산정 안 함. 동점은 최신글 우선. 공개 가능한 snapshot만 사용.
- 구해요 라벨은 해줘요로 변경(request 내부값 유지). 질문/후기/자유까지 네 종류. 질문·후기·자유 분야 선택은 선택사항, 해줘요는 필수.
- SQL 0003_free_post_type.sql 추가 및 PGlite 실행 통과. 원격 적용은 하지 않음.
- 검증: unit/DB 20개 통과, 커뮤니티 E2E 2개 및 신규 자유글/인기글 E2E 1개 통과. 타입/린트 통과. 신규 E2E는 label 선택자를 수정하여 재실행 통과.

## GitHub 저장소 연결 준비
- 사용자 지정 원격: https://github.com/gyroscopemooa/matda.git (초기 조회 시 비어 있음). 사용자 커밋/푸시 승인에 따라 첫 버전 관리 준비.
- .env 실제값, .local 회원/첨부 데이터, node_modules, Next 빌드, 테스트 보고서 및 docs 테스트 캡처는 추적 제외. .env.example은 빈 연결키만 포함.
- 다음 작업은 생성된 Supabase 프로젝트에 실제 Auth/DB 어댑터 연결. 이번 Git 업로드는 배포 또는 Supabase 연결 완료를 의미하지 않음.

## Supabase 프로젝트 연결 준비 및 실접근 확인
- 사용자 제공 프로젝트 URL과 publishable key를 Git 제외 .env.local에 저장. 키 값은 상태문서에 기록하지 않음.
- Auth settings 읽기 HTTP 200 확인: 이메일 활성, Google 비활성. profiles 읽기는 PGRST205(테이블 schema cache 미존재). 전체 DB가 비어 있다고 단정하지 않음.
- 기존 0001~0003 migration을 단일 트랜잭션으로 묶은 supabase/SETUP_DATABASE.sql 준비. 원격 SQL 적용은 아직 하지 않음.
- 공개용 키는 관리자 SQL 권한이 없으므로 SQL Editor에서 초기 구조 적용 필요. 기존 테이블을 덮어쓰지 않고 충돌 시 전체 롤백.
- 앱은 여전히 local adapter 사용. Auth/DB 실제 어댑터 연결 및 구글 OAuth 설정이 남아 있음. 키 접근 성공을 서비스 연동 완료로 표시하지 않음.

## Supabase 초기 SQL 원격 적용 확인
- 사용자 SQL Editor 실행 성공 보고 후 공개키로 profiles/posts/comments/platform_settings 조회(limit=0) HTTP 200 확인. conversations는 비로그인 권한 거절(42501)로 공개 차단 확인.
- 로그인 사용자별 RLS 검증이나 실제 앱 저장 전환 완료를 의미하지 않는다. 앱은 local adapter 상태이며 Supabase Auth/DB adapter 구현과 OAuth 설정이 남아 있다.

2026-09-20 카테고리 개편 최종 production build 성공. 모바일 제목 단어 줄바꿈 보완 후 온라인 요청 E2E 재통과.

## 2026-09-20 향후 플랫폼 및 가이드 운영 계획
민간 플랫폼 전환 계획과 가이드 편집 주제 확장을 MD로 저장했다. 현재 Phase/UI 변경 및 신규 글 발행 없음. 자동 발행·관리자 초안함 미구현 상태 유지.

## 2026-09-20 커뮤니티 관리자
기존 Google 연동 요청 계정을 확인하여 로컬 preview 관리자 역할 부여. MY 관리자 대시보드 링크, 전체 글/댓글 검색 및 삭제 처리(숨김)/복원 추가. 기존 신고 처리/계정 제한 유지. 로컬 관리자 CLI의 CJS top-level await 오류 수정 및 transact 원자적 저장 사용. 원격 Supabase 권한은 미부여이며 SQL Editor 인증 및 migration0004가 필요하다. 타입/린트와 관리자 E2E 통과.

## 2026-09-20 원격 DB 업그레이드 반영 확인
사용자 SQL 실행 후 공개 API 읽기 검증: profiles.avatar/disabled, posts.images/schedule/budget/service_mode, comments.status 조회 성공. consumer 활성 카테고리 6+기타 확인. 통합 SQL 마지막 단계 변경이 반영됨. media 조회는 비로그인 42501 권한 거부이므로 이 경로로 컬럼 검증 불가. 로그인 사용자 media/RLS·채팅 실동작은 추후 검증. R2 변수는 아직 없고 local adapter 유지. 운영 관리자 권한 부여는 별도 미완료.

## 2026-09-20 Supabase Storage 전환 준비
사용자가 community-images 버킷 생성 보고. 기본 사진 저장소를 Supabase Storage로 변경하며 R2 코드는 MEDIA_STORAGE_PROVIDER=r2로 유지. 파일별 storage_provider를 기록하여 기존 R2 사진은 R2로 조회한다. 공개 사진 리다이렉트는 공개 메타데이터 전용 RPC를 사용한다. 사진 2MiB 제한, JWT로 본인 경로 업로드/삭제, 업로드 metadata 실패 시 파일 정리. migration 0007_supabase_storage.sql을 SQL Editor에서 한 번 적용해야 한다(통합 UPGRADE_COMMUNITY 재실행 금지). 실제 원격 업로드는 SQL 적용 및 로그인 연결 후 검증해야 한다. local adapter는 유지했다. 28개 단위/DB 테스트에 Storage 소유자 격리·삭제 권한 및 새 SQL 검증 포함, 통과.

## 2026-09-20 Storage SQL 원격 반영 확인
사용자 성공 보고 후 공개 이미지 RPC community_public_image를 비로그인으로 호출하여 정상 응답/존재하지 않는 ID의 빈 결과 확인. profiles/posts/comments 스키마 정상, media 직접 조회는 비로그인 권한 차단(42501). migration0007의 RPC 배포 확인이며 실제 이미지 업로드·소유자 삭제·사진 표시 실검증 완료를 의미하지 않는다. 현재 앱은 local adapter 유지. 다음 작업은 원격 모드에서 로그인 및 사진 업로드 검증이다.

## 2026-09-20 원격 미리보기 전환
.env.local의 DATA_ADAPTER/MEDIA_STORAGE_PROVIDER를 supabase로 지정하고 3107 서버 재시작. 비로그인 /api/app 200, mode=supabase, rows=0 확인. 로컬 기존 DB 보존 및 자동 이전 없음. 비로그인 media 전체조회 제거(공개 사진 조회는 전용 RPC). 회귀 테스트28개 통과. 실제 로그인 사진 업로드는 사용자 세션 테스트 대기. 원격 관리자 역할은 별도 부여 필요.

## 2026-09-20 헤더 프로필 이미지
헤더 MY 링크를 닉네임 앞2글자에서 공통 Avatar로 변경. 업로드 사진 또는 선택한 기본 아바타 표시, 접근성 이름과 툴팁은 닉네임+마이페이지.

## 2026-09-20 Cloudflare Workers 배포 준비
사용자 선택에 따라 Workers + OpenNext 설정과 Git 빌드 명령 추가. 사진/인증/DB는 Supabase 유지. Next production build 통과, Windows OpenNext 최종 번들은 symlink EPERM으로 실패하여 Workers 실행 검증은 미완료. Cloudflare Linux Git build/deploy가 다음 단계. .env 파일 포함 빌드를 차단하여 로컬 설정 번들 유출 예방. 실제 배포/DNS 변경 없음. docs/CLOUDFLARE_DEPLOY.md 참조.


## 2026-09-20 채팅 스크롤 및 나가기
PC 목록 약 5개 높이(510px), 모바일 약 3개 높이에서 독립 스크롤. 대화 패널 flex로 입력창 하단 유지. 나가기는 본인 목록 숨김이며 상대 기록 보존, 새 수신 메시지나 명시적 재진입 시 표시. SQL 0008_chat_leave.sql 신규 RPC/left_at 추가(원격 적용 대기). 단위/DB 29개 및 PC1440/모바일390 채팅7개 E2E 통과. Workers 생성 타입의 앱 전역 충돌을 tsconfig exclude로 방지.

