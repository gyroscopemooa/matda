# Cloudflare Workers 배포

사이트는 Workers + OpenNext, DB/인증/사진은 기존 Supabase를 사용한다. Pages나 R2를 새로 만들 필요는 없다. 현재는 배포 준비 단계이며 실제 배포/도메인 연결은 미완료다.

## Git 연결

Cloudflare → Compute → Workers & Pages → Create application → GitHub 저장소 연결 → gyroscopemooa/matda, main 선택. Worker 이름은 `matda`, 루트 디렉터리는 저장소 루트.

- Build command: `npm run cf:build`
- Deploy command: `npm run cf:deploy`
- Node 버전: `NODE_VERSION=24`
- Build 환경변수: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = 기존 프로젝트의 publishable key
- Worker 런타임 Variables and Secrets에도 같은 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 설정
- 나머지 공개 설정은 wrangler.jsonc가 관리한다. Phase 1, Supabase Storage, matda.net 기준.

재배포 시 대시보드에서 추가한 런타임 변수는 `keep_vars: true`로 유지한다. wrangler.jsonc의 vars에 명시된 같은 이름의 값은 코드 설정이 우선하므로 그 값은 저장소에서 변경한다. Build 환경변수는 Cloudflare Builds 설정에 별도로 저장되며 Git push마다 다시 입력하지 않는다. Secret은 코드에 넣지 않고 대시보드에서 관리한다.

service_role 키와 Google OAuth client secret은 여기에 넣지 않는다. Google secret은 Supabase Provider 설정에만 둔다. `.env.local`을 Git에 올리지 않는다. cf:build는 .env 파일이 있는 작업 폴더에서 중단한다. 개발 파일을 삭제하지 말고 Cloudflare의 깨끗한 Git checkout에서 빌드한다.

## 배포 확인 후 도메인 연결

1. Linux 빌드 및 deploy 로그에서 성공 여부를 확인한다. 실패 시 오류 로그로 수정하며 성공으로 간주하지 않는다.
2. Worker Settings → Domains & Routes에서 matda.net 연결. 도메인 소유 및 DNS 상태 확인 후 적용한다.
3. Supabase Site URL은 https://matda.net, redirect 목록에는 https://matda.net/auth/callback 및 비밀번호 재설정 경로를 등록한다. 상세는 COMMUNITY_LAUNCH.md.
4. 실제 도메인에서 Google/이메일 로그인, 사진, 다른 계정의 댓글·채팅·알림을 검증한다. workers.dev에서는 canonical URL이 matda.net이므로 로그인 최종 검증을 하지 않는다.
5. 관리자 권한/약관/문의처/SMTP 등 출시 확인 뒤 검색 차단을 해제한다. AI 가이드 자동 작성은 별도 후속 작업이다.

## 검증 이력과 제한

2026-09-20: Next.js 16.3.5 production build 성공. OpenNext 1.20.6의 custom distDir 경로 문제를 확인하여 Cloudflare 빌드는 기본 .next 사용. Windows에서 최종 번들 생성은 symlink EPERM으로 실패했다. Workers 실행/번들 용량/실제 배포는 아직 검증하지 못했으며 Cloudflare Linux 빌드가 다음 확인 단계다. 기존 3107 개발 미리보기와 Supabase 데이터는 유지한다.

참조: https://opennext.js.org/cloudflare/get-started
