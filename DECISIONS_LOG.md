# DECISIONS LOG

> 요구사항이 바뀔 때 삭제하지 말고 새 항목을 추가한다.

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
