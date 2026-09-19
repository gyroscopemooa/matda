# 해죠 / MATDA BIZ

첨부 기준문서의 커뮤니티 → 견적 → 업체 → BIZ → RFQ/계약 → 민간입찰 흐름을 구현한 **로컬 MVP**입니다.
현재 데이터·인증·파일은 로컬 개발 어댑터로 작동합니다. Supabase/R2/Turnstile/실제 PG는 연결하지 않았으며 공개 서비스로 배포한 상태가 아닙니다.

## 바로 실행

Node.js 24 / npm 기준. 이 폴더에서:

```powershell
npm ci
npm run preview
```

브라우저에서 http://127.0.0.1:3107 을 엽니다. 미리보기 데이터는 `.local/preview/`에 저장되고 서버를 다시 시작해도 유지됩니다. 예시 글 5개에는 예시 표시가 있습니다. 직접 가입한 테스트 회원으로 글을 등록하면 실제 로컬 저장·채팅·견적을 체험할 수 있습니다.

일반 회원과 업체 회원을 별도 브라우저 프로필에서 가입하면 양측 거래 흐름을 확인할 수 있습니다. 한 계정에서도 MY의 `업체 기능도 사용하기`, `기업 등록`을 통해 역할을 확장할 수 있습니다.

## 화면

- `/`, `/community`: 피드·검색·지역·카테고리·글/댓글/사진
- `/posts/[id]`: 견적·비교·선택·거래확인·후기·채팅 시작
- `/quotes`, `/providers`, `/providers/[id]`: 견적 요청 탐색, 업체·포트폴리오
- `/chat`, `/chat/[id]`, `/my`, `/notifications`
- `/biz`: 기업 요청, `/biz/rfqs/[id]`: 비공개 제안
- `/biz/contracts`: 사업장·계약·만료/점검·갱신
- `/biz/tenders/[id]`: 민간 공개 제안입찰, 봉인·수정·철회·개찰·수동 선정
- `/admin`: 회원 제한·신고·사업자 확인·활동 집계 (관리자만)

결제는 비활성화 상태입니다. 정산예정금/원장은 mock 계산이며 실제 자금을 보관하거나 지급하지 않습니다.

## 검증

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

브라우저 테스트는 터미널 두 개를 사용합니다.

```powershell
# 터미널 1: 매 실행마다 격리된 새 테스트 데이터 디렉터리를 만듭니다.
npm run dev:test
# 터미널 2:
npm run test:e2e
```

기본 E2E 브라우저는 이 PC에 설치된 Microsoft Edge입니다. 다른 환경에서는 `playwright.config.ts`의 executablePath를 설치된 브라우저 경로로 변경합니다. 테스트는 외부 서비스나 실제 회원 데이터를 사용하지 않습니다. 재실행 전 테스트 서버를 재시작하면 항상 동일한 초기 조건으로 검증합니다.

## 로컬 관리자

미리보기에서 계정을 가입한 뒤 **서버를 중지**하고 아래 명령을 실행합니다.

```powershell
$env:LOCAL_DATA_DIR='.local/preview'
npm run local:admin -- 실제로가입한테스트이메일
npm run preview
```

이 스크립트는 지정한 로컬 회원의 관리자 역할만 변경합니다. 일반 가입 요청에는 관리자 역할을 허용하지 않습니다.

## 구성과 제한

- `src/lib/domain.ts`: 거래 규칙·권한·마감 상태 처리
- `src/lib/store.ts`: 단일 프로세스 로컬 저장. 수평 확장/실서비스용 DB가 아닙니다.
- `supabase/migrations/`: PostgreSQL 스키마/RLS와 견적·투찰·개찰·선정 RPC. PGlite에서 실행 검증했으며 원격 Supabase에는 적용하지 않았습니다.
- `src/lib/config.ts`: 브랜드·견적정책·기능 플래그
- `src/lib/payments.ts`: 비활성 결제/지급 mock, 정수 원장, 환불 멱등성/대사
- `.env.example`: 연결 시 필요한 변수 이름. 값만 넣는다고 원격 어댑터로 자동 전환되지 않습니다.
- 채팅은 로컬 5초 폴링입니다. 계약/마감 알림은 API 조회 시 생성되며 백그라운드 발송은 없습니다.
- PWA manifest만 준비했습니다. 오프라인 캐시·푸시·네이티브 앱은 구현하지 않았습니다.
- 미리보기는 검색엔진 noindex입니다. 실제 공개 전 외부 연결, 정책 확정, staging 검증을 완료해야 합니다.

진행 근거는 `BUILD_PROGRESS.md`, 결정 이력은 `DECISIONS_LOG.md`, 남은 연결 작업은 `docs/ACTIVATION_CHECKLIST.md`를 확인하세요. 다운로드 원본 ZIP/마스터 문서는 변경하지 않았습니다.


## 단계별 공개 (2026-09-20 수정)
현재 공개 UI는 Phase 1입니다. `NEXT_PUBLIC_RELEASE_PHASE` 기본값은 1이며 헤더/모바일 메뉴는 홈·커뮤니티만 노출합니다. 글쓰기·댓글·지역·검색·로그인·채팅·MY는 유지합니다. 견적 입력/상태·업체 진입점·기업 관리와 후속 경로 직접 접근은 숨기거나 차단합니다.

- 1: 커뮤니티
- 2: 견적받기 추가
- 3: 업체찾기 추가
- 4 이상: 기업서비스 추가

`.env.local`에 `NEXT_PUBLIC_RELEASE_PHASE=2` 등으로 설정하고 개발 서버를 재시작합니다. production에서는 NEXT_PUBLIC 값이 빌드에 고정되므로 다시 빌드해야 합니다. 개별 기능 플래그가 false이면 해당 Phase에서도 비활성입니다. 실제 결제/외부 연결 정책은 그대로 유지됩니다.
`npm test`와 `npm run dev:test`는 후속 기능 회귀를 위해 별도 프로세스에서 Phase 8을 사용합니다. 기본 미리보기의 Phase 1 설정을 변경하지 않습니다. 미리보기 실행 중 `node scripts/check-phase1.mjs`로 PC/모바일 메뉴·MY·글쓰기·직접 주소 차단을 확인할 수 있습니다.

지역 설정: 상단 지역 버튼에서 커뮤니티 범위를 선택합니다. 글쓰기는 시/도와 시/군/구를 고르고 동은 생략할 수 있습니다. MY에서 기본 지역 설정도 가능합니다. 신규 계정에 지역을 임의 지정하지 않습니다. 데이터 출처/기준일/갱신: docs/REGIONS.md.
