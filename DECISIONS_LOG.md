# DECISIONS LOG

## 2026-09-20 — Phase 2를 중단 없이 구현·검증

사용자 요청에 따라 중간마다 멈추지 않고 견적 전체 흐름 개발을 마무리한다. 로컬은 후속 기능 테스트 허용, 운영은 Phase 1 유지. 개발·로컬 검증100%와 실제 원격 적용·공개를 구분한다. 연락처는 기본 고객 선택 후 공개, DB 정책으로 업체 수락도 요구 가능. 후기는 고객 거래 자가확인 이후 허용하며 플랫폼 거래 인증으로 표현하지 않는다. 원격 적용은 staging 절차로 모으고 지금 실행하지 않는다.

> 요구사항이 바뀔 때 삭제하지 말고 새 항목을 추가한다.

## 2026-09-20 — 사용자 요청: 글 읽기와 사진 배치
- 후속 지시로 상세의 큰 원본비율 나열을 정사각형 균일 그리드로 변경한다. 원본 비율은 클릭해 새 탭에서 확인한다. 저장 파일은 변경하지 않는다.
- 상세는 글종류 옆 지역, 오른쪽 작성자/아바타/날짜, 아래 제목/사진/본문 순으로 구성한다.
- 목록 첫 사진을 오른쪽 대표 이미지로 쓰고 추가 사진은 그 아래 작게 표시한다. 사진 클릭은 저장본 확대(새 탭)를 제공한다.
- 제목은 최대 2줄 표시하고, 시도 전체 범위의 글 등록을 허용한다. 기존 시군구 필수 정책은 이번 사용자 지시로 변경한다.

## 2026-09-20 — Phase 1 출시 준비 7항목
- Supabase JWT 및 normalized table repository를 local adapter와 분리한다. RLS를 우회하는 service-role key는 사용하지 않는다. Phase 2+ 원격 액션은 거절한다.
- 사진은 기준문서의 R2를 유지한다. 공개 커뮤니티 이미지 metadata만 Supabase에 저장한다. 기존 로컬 사진/글/이메일 비밀번호를 운영 데이터로 자동 복제하지 않는다.
- 회원 프로필의 기존 Auth metadata는 최초 기본값에만 쓰며 관리자 권한은 private community_admins 테이블에서만 판단한다.
- Realtime 수신과 재연결 후 snapshot 갱신, 5초 채팅/30초 일반 화면 폴링을 함께 유지한다. OS push는 범위에 포함하지 않는다.
- 테스트는 격리 데이터로 수행하고 사용자 수동 테스트는 실제 연결 후 한 번에 진행한다. 운영자 로그인이 없어 DB 업그레이드/SMTP/R2/호스팅/DNS는 준비 문서와 별도 미완료로 기록한다.
- Next.js는 npm audit 확인에 따라 16.3.5로 보안 패치했다. UI Phase 1과 사용자 승인 브랜드 시안을 유지한다.

## 2026-09-20 — Google OAuth 시작 연결
- Google OAuth는 Supabase Auth Provider를 사용한다. 프로젝트 공개키와 URL은 Git 제외 `.env.local`에만 저장한다.
- OAuth 시작/콜백에는 PKCE를 사용하고, nonce 검사 및 이메일 없는 계정은 허용하지 않는다.
- 콜백 주소는 `NEXT_PUBLIC_SITE_URL`에서 만들어 개발 주소가 Next 개발 서버의 localhost 정규화에 의해 달라지지 않도록 한다.
- Google 인증 계정은 현 단계에서 로컬 개발 저장소의 사용자와 연결된다. 데이터 저장의 Supabase 전환 전에는 공개 출시로 표시하지 않는다.
- Next 개발 서버의 URL 정규화와 PKCE host-only 쿠키가 충돌하지 않도록, localhost 요청은 설정된 127.0.0.1 개발 호스트에서 OAuth를 다시 시작한다.

## 2026-09 — 핵심 제품 결정
- 커뮤니티 → 민간견적 → 업체찾기 → B2B로 연속 확장한다.
- 커뮤니티가 활성화되지 않아도 기본 로드맵 개발은 계속한다.
- 커뮤니티는 최종 서비스에서도 유지한다.
- 모바일 퍼스트.
- PC는 동일 디자인시스템을 넓게 재배치한다.
- 새 Phase마다 UI를 갈아엎지 않는다.
- 글쓰기는 자유글 우선, 최소 필수정보만 요구한다.
- 초기 소비자 카테고리는 6개.
- 요청당 기본 견적 5개, 최대 10개.
- 기본 모집 72시간, 24시간 연장 기본 최대 2회.
- 선택 전 연락처 비공개, 내부채팅 활성화.
- 초기 수익화보다 활성화 우선, 대부분 무료.
- 소비자 브랜드 작업명 `해죠`, BIZ `MATDA BIZ`, 상위 `MATDA`.
- BIZ 구조는 `업체 구함 → 비교견적/RFQ → 민간입찰 → 계약관리`.
- 입찰은 별도 조달 모듈로 설계.
- 입찰에 CAD/도면 편집 프로그램은 만들지 않고 파일첨부로 처리.
- 공공 법정조달 대체를 표방하지 않는다.
- 결제/정산은 `결제수단 / 내부원장 / 실제지급`을 분리한다.
- 초기부터 PG 분리정산을 필수로 두지 않는다.
- 자체 지갑/충전금/사용자간 송금은 초기 미구현.
- 전문가/업체 UI는 `정산예정금` 개념 사용.
- 디자인은 기존 컨셉샷을 GUI 개발 레퍼런스로 포함한다.

## 2026-09-18 — Implementation foundation
- Separate attached master prompt copied to /MASTER_PROMPT.md; original Downloads files remain intact.
- Empty workspace: Next.js + TypeScript retained as prescribed new-project stack.
- References visually inspected before implementation. Community-first home retained as later routes expand.
- Missing external credentials do not stop development: explicit local server adapter with production fail-closed guard; remote migration and connection checklist separate.
- Local preview port 3107 because OS denied binding port 3000.
- Mock account passwords hashed with scrypt; sessions HttpOnly; no localStorage auth/authorization.
- Browser found and corrected local Origin comparison and mobile icon-only submit labels.
- PostgreSQL-compatible PGlite tests validate migration and RLS without claiming a connected Supabase project.


## 2026-09-20 — 재개 및 최종 로컬 통합 검증
- 정체된 30% 상태 문서를 실제 코드/테스트와 대조했다. 진행률은 로컬 MVP 기준이며 공개 출시 준비와 별도로 보고한다.
- Phase 0–8 원본 55개 체크리스트의 로컬 구현과 대표 회귀검증 완료. Phase 9는 manifest와 준비 문서까지만 포함한다.
- Supabase/R2/Turnstile 실제 어댑터는 미구현임을 명시한다. 키 입력만으로 자동 연결된다고 안내하지 않는다. production 로컬 실행 및 실제 결제 활성화는 기본 거절한다.
- 업무문서 첨부를 공개 이미지로 분류하는 우회 업로드를 거절한다. 비공개 링크는 짧은 만료와 사용자 세션, 대상 권한을 함께 검사한다.
- 글의 견적 옵션을 껐다 켜도 모집기간을 초기화하지 않는다. 거래완료 응답을 취소하면 완료 상태도 제거한다.
- 조직 일반 구성원은 열람만 가능하며 조달 변경은 관리자/조달 역할로 제한한다.
- 서버 조회 기반 알림/로컬 채팅 폴링을 현재 동작으로 명시한다. 백그라운드 발송/Realtime은 후속 연결 작업이다.
- 자동 테스트 서버와 미리보기 데이터 및 Next 출력 경로를 분리했다. 저장 데이터/기준문서를 production 파일 추적에서 제외했다.
- Next 16 bundled docs에 따라 streaming not-found는 HTTP 200일 수 있으므로 화면과 noindex를 검증한다.
- 최종 npm test 17개 및 Edge E2E 9개 통과, production build 성공. 상세 근거는 docs/QA_REPORT.md.
- 다운로드 원본 파일은 수정하지 않았다. 작업 폴더 기준문서 사본의 진행/결정 로그만 동기화한다.

## 2026-09-20 — 사용자 명시 수정: Phase별 UI 승격
- 기능 개발은 앞서가도 메뉴 공개는 해당 Phase에서만 한다.
- 기본 공개 단계 1: 홈/커뮤니티, 구해요/질문/후기/글쓰기, 지역/검색/로그인, 최소 채팅/MY.
- 견적은 Phase 2, 업체마켓은 Phase 3, BIZ는 Phase 4부터 공개한다. Phase 1에서는 준비중 메뉴도 노출하지 않는다.
- NEXT_PUBLIC_RELEASE_PHASE를 공통 기준으로 메뉴/화면/직접 주소 접근을 제어한다. 기존 후속 구현은 삭제하지 않으며 전체 회귀 테스트는 별도 Phase 8 프로세스로 실행한다.
- 이전 100%는 내부 로컬 구현 기준이었다. 공개 Phase와 최종 디자인/출시 완성도를 의미하지 않도록 상태 문서에 구분한다.

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

## 2026-09-20 요청형 커뮤니티 범위
요청자와 서비스 제공자를 연결하는 방향으로 카테고리를 6+기타로 개편한다. 제작·디지털은 웹/앱, 디자인, 촬영/영상 작업을 포함한다. 서비스 방식은 지역/전국·온라인을 선택하고, 글종류 해줘요·질문·후기·자유는 유지한다. 온라인 필터는 지역 선택과 독립적으로 작동한다. 견적 기능 활성화와 후속 Phase 메뉴 노출은 이번 변경에 포함하지 않는다. 참고 제안의 최소 금액이나 특정 직업 제한은 강제 규칙으로 도입하지 않는다.

## 2026-09-20 향후 플랫폼 및 가이드 운영 계획
민간 견적 단계에서 해줘요를 견적 요청으로 통합하고 커뮤니티 질문/후기를 보조 영역으로 유지한다. 이번에는 문서만 저장. 상세: docs/CONSUMER_PLATFORM_TRANSITION.md. 가이드는 팁·노하우 중심으로 일상 관리 주제를 확대하고 분쟁/법률은 공식 근거 검토 후 간헐 발행한다. 상세: docs/GUIDE_EDITORIAL.md.

## 2026-09-20 Supabase Storage 전환 준비
사용자가 community-images 버킷 생성 보고. 기본 사진 저장소를 Supabase Storage로 변경하며 R2 코드는 MEDIA_STORAGE_PROVIDER=r2로 유지. 파일별 storage_provider를 기록하여 기존 R2 사진은 R2로 조회한다. 공개 사진 리다이렉트는 공개 메타데이터 전용 RPC를 사용한다. 사진 2MiB 제한, JWT로 본인 경로 업로드/삭제, 업로드 metadata 실패 시 파일 정리. migration 0007_supabase_storage.sql을 SQL Editor에서 한 번 적용해야 한다(통합 UPGRADE_COMMUNITY 재실행 금지). 실제 원격 업로드는 SQL 적용 및 로그인 연결 후 검증해야 한다. local adapter는 유지했다. 28개 단위/DB 테스트에 Storage 소유자 격리·삭제 권한 및 새 SQL 검증 포함, 통과.

## 2026-09-20 Cloudflare Workers 배포 준비
사용자 선택에 따라 Workers + OpenNext 설정과 Git 빌드 명령 추가. 사진/인증/DB는 Supabase 유지. Next production build 통과, Windows OpenNext 최종 번들은 symlink EPERM으로 실패하여 Workers 실행 검증은 미완료. Cloudflare Linux Git build/deploy가 다음 단계. .env 파일 포함 빌드를 차단하여 로컬 설정 번들 유출 예방. 실제 배포/DNS 변경 없음. docs/CLOUDFLARE_DEPLOY.md 참조.

# 2026-09-20 Phase 2A 진행

다음 단계 진행 요청에 따라 기존 전환 계획의 구현을 시작했다. 기존 글 전환은 별도 동의 액션으로 만들고 원래 ID를 유지한다. 견적 시작 후 일반 글 전환/분야 변경은 차단한다. 모집 최대기간은 원래 글 작성일이 아닌 견적 시작일 기준이다. 원격 서비스는 후속 견적·거래 연결 전까지 Phase 1로 유지한다. 진행률은 docs/PHASE2_PROGRESS.md의 6개 완료 묶음 기준으로 관리한다.
