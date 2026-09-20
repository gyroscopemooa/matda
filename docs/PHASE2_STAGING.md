# Phase 2 원격 적용 안내 — 아직 실행하지 않음

현재 운영은 Phase 1이다. 이 문서는 사용자가 공개/배포 범위를 승인한 뒤 별도 staging에서 실행하는 절차다. 코드 완성과 원격 실행 검증을 구분한다.

## 1. 별도 staging 준비

운영과 분리된 Supabase 프로젝트와 staging 도메인을 사용한다. 기존 Phase 1 migrations 0001~0014 적용 여부를 확인한 뒤 0015 → 0016 → 0017 순서로 적용한다. 0017은 `quote-documents` private 버킷을 생성한다. 기존 public 사진 버킷은 변경하지 않는다. service_role 키를 클라이언트에 넣지 않는다.
새 스키마는 기본 비활성이므로 SQL 적용만으로 견적 기능이 열리지 않는다. 기존 수동 SQL 적용 이력과 migration 이력이 다를 수 있으므로 운영 프로젝트에서 무조건 전체 db push를 실행하지 않는다.

## 2. staging에서만 명시적으로 활성화

staging 빌드/런타임 값을 맞춘다. NEXT_PUBLIC 값은 재빌드가 필요하다. 현재 운영 wrangler 값은 Phase 1로 유지되어 있으므로 운영 Worker 설정을 staging 값으로 바꾸지 않는다.

```text
DATA_ADAPTER=supabase
NEXT_PUBLIC_RELEASE_PHASE=2
NEXT_PUBLIC_QUOTES_ENABLED=true
CONSUMER_QUOTES_REMOTE_ENABLED=true
PAYMENTS_ENABLED=false
TENDERS_ENABLED=false
NEXT_PUBLIC_SITE_URL=<staging HTTPS 주소>
NEXT_PUBLIC_SUPABASE_URL=<staging Supabase 주소>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<staging publishable key>
```

staging DB SQL Editor에서만:

```sql
update public.platform_settings set value='true'::jsonb
where key='consumer_quotes_enabled';
-- 기본은 고객 선택 후 연락처 공개. 업체 수락도 요구하려면 true.
update public.platform_settings set value='false'::jsonb
where key='quote_require_acceptance';
```

연락처 정책은 원격 DB가 최종 결정한다. 로컬 수락 대기 재현은 서버 시작 전 QUOTE_REQUIRE_PROVIDER_ACCEPTANCE=true로 설정한다.

## 3. 두 계정 실제 통합 확인

1. staging Google OAuth redirect 설정 후 고객/업체 계정으로 로그인한다. MY에서 업체 기능을 켜고 업체명·서비스·지역·연락처를 저장한다.
2. 지역 요청과 전국·온라인 요청을 작성한다. 기존 해줘요 전환의 URL/사진/댓글/채팅 보존을 확인한다.
3. 템플릿 저장, 견적 제출/수정, 서로 다른 업체6개의 5개 한도/추가5개/최대10개, 동시 제출과 동시 선택을 확인한다.
4. 요청자와 견적 작성자만 금액/본문/PDF를 볼 수 있는지 확인한다. 비참여 계정·비로그인은 다운로드 불가. 파일10MB 이하, 서명 링크60초.
5. 견적2~3개 비교, 고객 먼저 채팅 시작, 업체의 같은 대화 재진입, 업체 선택 후 금액·첨부 변경 차단을 확인한다.
6. 연락처가 선택/수락 정책 이후에만 보이는지, 차단 상대와의 채팅·연락처 접근 차단을 확인한다.
7. 고객/업체 확인 분리, 양측 확인 시 완료시각, 고객 확인 후 후기·중복차단, 일반 후기와 표시 구분을 확인한다.
8. 72시간 만료/24시간 연장2회·최대120시간 및 활성 요청 한도(전체5, 같은분야2)를 확인한다. 서버 시간을 바꾸는 대신 전용 fixture 요청의 만료시각으로 검증한다.
9. PC1440/모바일390 비교표·첨부·입력·홈 확인. Phase 3 업체찾기와 Phase 4 기업 기능은 준비 중이어야 한다.

## 4. 운영 공개/복구

staging 검증 기록을 남긴 뒤 사용자의 운영 공개 결정을 받는다. 공개 승인 없이 main push/운영 SQL/Worker 변수 변경을 진행하지 않는다.
문제가 있으면 DB consumer_quotes_enabled=false로 신규 견적 작업을 차단하고 운영 빌드를 Phase 1로 되돌린다. 커뮤니티 글·견적·후기는 삭제하지 않는다. DB 구조를 삭제하는 rollback은 사용하지 않는다.
운영 push 전 AGENTS.md의 커밋·공개 설정·실제 화면/API 확인 규칙을 따른다. 실제 배포 확인 전에는 출시 완료로 보고하지 않는다.

## 제안 흐름 추가 적용
0017 다음 0018_proposals_and_shared_questions.sql을 적용한다. 확정/예상/확인 후 가격 및 선택 제한, 참여 업체 공통 질문 RLS와 공유 동의, 모집기간 종료 후 기존 제안 최종 수정도 검증한다. 롤백은 Phase 1로 닫고, null 금액이 생기므로 이전 Phase 2 코드로 바로 되돌리지 않는다. 상세: PROPOSAL_WORKFLOW.md.
