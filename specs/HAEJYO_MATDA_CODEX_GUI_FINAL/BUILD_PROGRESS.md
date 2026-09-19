# BUILD PROGRESS

최종 갱신: 2026-09-20 (Asia/Seoul)
현재 공개 단계: **Phase 1 — 커뮤니티만 노출**. 후속 Phase 구현은 코드에 보존.
이전 55/55 및 100% 표시는 대표 흐름 위주의 기록으로, 지역 계층 선택 누락을 반영하지 못했다. 전체 완성률로 사용하지 않는다. 현재 공개 범위는 Phase 1이며 기능별 검증 근거로 관리한다.
공개 출시: **미완료**. 외부 어댑터 개발·서비스 연결·staging 검증은 별도이며 아래 완료 체크에 포함하지 않는다.

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
