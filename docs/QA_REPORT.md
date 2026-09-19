# QA REPORT — 2026-09-20

## 실행 결과

|검증|결과|범위|
|---|---|---|
|npm test|17 passed, 0 failed|도메인/권한/환경/알림/원장/SQL RLS|
|npm run test:e2e|9 passed, 0 failed, 46.0s|Microsoft Edge, 격리된 로컬 데이터|
|npm run lint / typecheck|모두 통과|ESLint 오류/경고 없음, tsc --noEmit|
|npm run build|성공|Next 16.3.1 production compile, TypeScript, route generation|

## Phase 근거

- 0: 디자인 레퍼런스 5개 확인. PC/모바일 shell, 환경 fail-closed, 브랜드/정책 설정, PGlite migration 실행.
- 1: 최소 글 등록/조회/수정/삭제 권한, 댓글, 채팅 참여자 제한/읽음/차단, 사진 압축/업로드/새로고침 유지, MY, 신고.
- 2: 5→10 견적 수, 72h/24h 연장2회/120h 최대, 활성요청 상한, 템플릿 재사용, 비교, 선택/연락처 정책, 양측 거래확인, 후기. 옵션 토글을 이용한 기한 초기화와 완료 취소 회귀 포함.
- 3: 프로필 검색/상세, 포트폴리오 업로드, 검증 신청과 관리자 승인, 업체 MY. 자기 승인 거절.
- 4: 조직/구성원 역할 권한, BIZ 화면/카테고리, 업체구함과 견적 흐름.
- 5: RFQ/제안 비공개, 조직 간 접근 거절, 사업장/계약/갱신/만료 및 점검 알림 멱등성.
- 6: 별도 입찰 상태, draft/publish, 봉인, 수정 버전, 철회, 서버 마감, 조기 개찰 거절, 개찰/수동 선정, 종료 상태/감사로그. 시간 이동은 격리 E2E fixture에서만 수행.
- 7: 관리자 신고/검증 처리, 계정 제한, 이벤트 집계, title/description/noindex, 입력 이스케이프, 파일 형식·권한·서명/만료·공개 분류 우회 차단.
- 8: 결제 비활성, mock provider, 정수 원장, 세율 설정, 환불 멱등성, 대사. 실제 결제는 실행하지 않음.

## 10가지 상태 커버리지

|상태|대표 근거|
|---|---|
|정상|가입→글→견적→선택→거래확인→후기, BIZ→RFQ/계약/입찰, 관리자 E2E|
|빈 상태|빈 검색/목록/신규 계정 shell|
|로딩|API 지연 응답 중 로딩 표시 E2E|
|오류|API 실패 후 오류/재시도, 잘못된 파일/금액/요청 검증|
|비로그인|guest 글쓰기/채팅/보호 화면 안내, 인증 없는 API 거절|
|권한 오류|채팅 IDOR, 조직 분리, 비공개 제안/파일, 봉인 입찰, 관리자/조달 역할|
|모바일|360/390px 레이아웃과 주요 거래흐름, 768px 태블릿|
|PC|1440px 3열 화면, 공개 경로 11개 overflow/console 검사|
|새로고침|글/댓글/프로필 사진/포트폴리오 저장 및 재조회|
|회귀|9개 E2E 전체 재실행, 17개 unit/DB 테스트|

상태 검증은 공유 shell과 대표 흐름을 포함한다. 각 기능의 모든 상태/입력 조합, 키보드·스크린리더 전수 접근성, 모든 브라우저/기종까지 완료했다고 주장하지 않는다.

## 보안 및 SQL 검증의 한계

PGlite에서 SQL migration과 역할 기반 RLS 정책을 실제 실행했지만 원격 Supabase Auth/Realtime/Storage 통합을 대체하지 않는다. 서버 로컬 JSON adapter는 단일 프로세스 개발용이다. MIME와 magic byte 검증은 악성파일 백신 검사가 아니다. 출시 전 staging, 백업/복구, 부하, 추가 보안/접근성 검증이 필요하다.

Next streaming not-found 응답은 HTTP 200일 수 있어 not-found 화면과 robots noindex를 확인했다. 이 동작은 node_modules/next/dist/docs의 not-found 설명에 근거한다.

## 재현

README.md의 명령을 따른다. `npm run dev:test`로 매번 새 격리 데이터 디렉터리를 만든 뒤 별도 터미널에서 `npm run test:e2e` 실행. 테스트 fixture는 `.local/e2e-*` 아래에서만 시간/관리자 역할을 변경하도록 제한했다. 보고서는 playwright-report/index.html, 캡처는 docs/*.png에 남긴다.

최종 미리보기 확인: http://127.0.0.1:3107/api/app HTTP 200. 데스크톱/모바일 캡처를 시각 검토했다. 테스트 서버는 종료하고 미리보기 서버만 실행 상태로 남겼다.

2026-09-20 Phase 공개 수정 검증: 기본 Phase 1 PC/모바일·MY·글쓰기·직접주소 제한 통과. 별도 Phase 8 전체 E2E 9/9 통과(32.8초), 도메인/DB 17/17 통과, lint/typecheck 통과. Phase 1 캡처: docs/phase1-390.png, docs/phase1-1440.png.

## 지역 계층 보완 검증
18개 unit/DB 테스트 통과. 기존 E2E 9개 통과, 신규 regions.e2e.ts는 guest 지역선택 로그인 제한 수정 후 단독 1개 통과(2.7초). 시도/시군구/읍면동 선택, 등록 저장, 필터 AND, 새로고침, 하위값 초기화, 모바일 폭, 잘못된 조합 API 400 검증. 데이터 최신성은 docs/REGIONS.md의 고정 스냅샷 기준.
`npm run build` 성공. 실제 Phase 1 미리보기 PC/모바일·MY·글쓰기·후속 경로 차단 확인도 통과.
