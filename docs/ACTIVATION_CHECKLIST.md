# 외부 연결 및 공개 활성화 체크리스트

현재: 로컬 어댑터만 실행 가능. 원격 키를 입력하는 것만으로 서비스가 연결되는 구현은 아닙니다. 다음 항목은 **남은 개발/운영 작업**이며 완료로 표시하지 않습니다.

## Supabase

1. 새 staging 프로젝트를 생성하고 Settings → API Keys에서 publishable/secret 키를 확인합니다. 서버 secret/service-role 키는 NEXT_PUBLIC 변수에 넣지 않습니다. [공식 API key 문서](https://supabase.com/docs/guides/getting-started/api-keys)
2. 현재 `.env.example`에는 legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 이름도 예약되어 있습니다. 실제 어댑터를 만들 때 프로젝트가 발급한 키 유형에 맞게 이름을 정리합니다.
3. SQL Editor에서 `0001_foundation.sql` → `0002_transactional_rpc.sql` 순으로 **빈 staging DB**에 적용합니다. 기존 운영 DB에 덮어쓰지 않습니다. 적용 전 백업, 적용 실패 시 트랜잭션 롤백, 이후 버전은 새 forward migration으로 수정합니다.
4. Supabase Auth/SSR 세션 어댑터와 로컬 Row→정규화 테이블 repository mapping을 구현합니다. 현재 로컬 사용자 UUID/세션/비밀번호를 그대로 production에 복제하지 않습니다.
5. RLS 적용 하에서 고객/업체/조직 구성원 테스트를 실행합니다. 서비스 역할로 모든 질의를 우회하는 연결은 허용하지 않습니다. 민감 쓰기는 RPC를 사용하며 아직 없는 CRUD RPC를 명세대로 추가해야 합니다.
6. 채팅 Realtime 채널을 참여자 범위로 연결하고 재연결·순서·중복·읽음 처리를 검증합니다. 현재 폴링을 이 단계에서 대체합니다.

## Cloudflare R2 / DNS

1. R2에서 공개 커뮤니티용과 비공개 업무문서용 bucket을 분리 생성합니다. [공식 bucket 생성](https://developers.cloudflare.com/r2/buckets/create-buckets/)
2. 비공개 bucket의 r2.dev 및 custom-domain 공개 접근을 켜지 않습니다. 공개 bucket 설정은 콘텐츠를 인터넷에 노출합니다. [공식 공개 접근 문서](https://developers.cloudflare.com/r2/buckets/public-buckets/)
3. `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`을 서버 환경에 설정합니다.
4. 현재 `/api/media` 로컬 저장을 S3-compatible R2 adapter로 교체합니다. 사전 권한검사 후 짧은 TTL의 presigned URL을 발급하고 입찰 개찰 상태까지 확인합니다. [공식 presigned URL 문서](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
5. MIME/시그니처·크기·개수 제한, 중도 업로드 실패, 고아 파일 정리, 백업/보존/삭제, 악성파일 검사 정책을 staging에서 검증합니다. 지금은 기본 형식/매직바이트 검사이며 바이러스 검사는 아닙니다.
6. 실제 배포 대상을 결정한 다음에만 도메인 DNS/CDN을 연결합니다. 본 작업에서는 공개 배포나 DNS 변경을 하지 않았습니다.

## Turnstile

1. Turnstile widget을 만들고 허용 도메인을 지정합니다. `NEXT_PUBLIC_TURNSTILE_SITE_KEY`와 서버용 `TURNSTILE_SECRET_KEY`를 분리합니다.
2. 가입/로그인/등록 요청의 클라이언트 토큰을 서버 Siteverify에 검증하는 코드를 연결합니다. widget만 표시하는 구현으로 완료 처리하지 않습니다.
3. 만료·재사용·위조 토큰을 거절하는 테스트를 추가합니다. 공식 문서상 토큰은 5분 유효하며 1회용입니다. [공식 서버 검증](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## 입찰 / 결제 / 공개 릴리스

- 민간입찰 약관, 참가조건/철회/유찰/분쟁 처리 규칙과 실제 사업자 정보를 확정합니다. 법정 공공조달 대체로 표시하지 않습니다.
- `TENDERS_ENABLED=false`가 production 기본입니다. 로컬 개발에서는 거래 흐름을 테스트할 수 있습니다.
- 결제·지급 provider는 mock만 있습니다. `PAYMENTS_ENABLED=true`를 설정하면 현재 환경 검증은 실행을 거절합니다.
- PG/은행 계약, 정산·환불·세무 정책을 확인한 후 실제 provider 및 webhook 검증/멱등성/대사를 연결합니다. 자체 지갑·자금보관은 구현 범위가 아닙니다.
- 개인정보처리방침·이용약관·보존기간·문의 채널은 사업자 확정 후 작성/검토합니다.
- staging의 Auth/DB/RLS/R2/Realtime/Turnstile 및 부하·복구·접근성 검증을 마치기 전 production 출시 게이트는 통과하지 않습니다.
- 원격 어댑터 구현을 마친 후 `validateEnvironment`의 지원 어댑터를 확장합니다. 단순히 보호 코드를 제거해 로컬 JSON 저장소를 공개 서비스로 사용하지 않습니다.

## Phase 9 준비

현재 manifest, 반응형 UI, 공통 도메인/타입이 있습니다. 로그인 세션/비공개 파일은 오프라인 캐시에서 제외하는 정책부터 정하고 service worker·푸시를 후속 구현합니다. Expo/React Native 전환은 실제 웹 사용 검증 이후 검토합니다.
