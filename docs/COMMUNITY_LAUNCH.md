# Phase 1 공개 연결 안내

> 최신 선택: 호스팅은 Cloudflare Workers, 사진은 Supabase Storage. 아래 과거 R2/Vercel 안내보다 [Cloudflare 배포 안내](CLOUDFLARE_DEPLOY.md)를 우선한다. DB/Storage SQL 적용 및 원격 미리보기 전환 완료. 실제 도메인 배포는 미완료.

2026-09-20: 원격 연결 코드와 로컬 자동 검증을 준비했다. 실제 Supabase 업그레이드, R2 계정 연결, 호스팅/DNS 적용 및 운영 환경 테스트는 완료되지 않았다. 기존 `npm run preview`는 로컬 데이터를 유지한다.

## 1. Supabase DB 업그레이드

현재 프로젝트는 0001~0003 적용 확인 이력이 있다. **SETUP_DATABASE.sql을 다시 실행하지 않는다.** 변경 전 DB 백업/복원 가능 여부를 확인하고 staging에서 먼저 검증한다.

SQL Editor → New query → `supabase/UPGRADE_COMMUNITY.sql` 전체 실행. 0004의 프로필·사진 metadata·일정·신고·채팅 RPC·RLS와 0005의 Realtime publication 등록, 0006의 카테고리 개편·서비스 방식 컬럼을 한 트랜잭션으로 적용한다. 실행 실패 시 전체가 롤백된다. 이미 적용된 파일은 반복 실행하지 않는다. 0004~0005까지 이미 적용했다면 통합 파일 대신 migrations/0006_request_categories.sql만 실행한다. 기존 conversation에 동일 `(created_by, post_id)` 중복이 있으면 unique index 생성이 중단되므로 임의 삭제하지 말고 정리 계획을 먼저 검토한다.

코드 롤백은 `DATA_ADAPTER=local`로 개발 미리보기만 복구한다. 운영 데이터를 로컬로 옮기거나 migration을 DROP해서 복구하지 않는다. 운영 배포 롤백 시 호환되는 이전 원격 버전 또는 maintenance 화면을 사용한다.

관리자는 일반 가입으로 만들 수 없다. 최초 운영자 로그인 후 SQL Editor에서 정확한 계정 UUID를 확인하고 한 번 실행한다:

```sql
-- Auth → Users에서 본인 UUID를 복사한다. 이메일이나 임의 UUID로 바꾸지 않는다.
insert into public.community_admins(user_id) values ('본인-Auth-UUID');
```

관리자는 `/admin`에서 게시글·댓글 숨김/복원, 신고 처리, 계정 제한을 수행한다. 다른 사람의 채팅을 읽는 권한은 부여하지 않는다. 조치는 `community_audit`에 기록된다.

## 2. 이메일·Google 인증

- Supabase Authentication → URL Configuration: Site URL을 실제 배포 주소로 설정한다. production은 `https://matda.net`.
- Redirect URLs: `https://matda.net/auth/callback`, `https://matda.net/auth/callback?next=/reset-password`. 개발용 `http://127.0.0.1:3107/auth/callback`은 개발 기간에만 유지한다.
- Google Cloud의 OAuth Authorized redirect URI는 **`https://affpkizmmfnmvyexugdu.supabase.co/auth/v1/callback`**이다. 이것을 앱 `/auth/callback`과 혼동하지 않는다. nonce/email 우회 옵션은 끈다.
- Email Provider 활성화 + Confirm email 활성화. 외부 사용자를 받기 전 Custom SMTP의 발송 도메인·발송 한도·테스트 수신을 설정한다. 실제 이메일 발송은 이번 자동 테스트에서 수행하지 않았다.
- Email Templates → Confirm signup의 링크:
  `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">이메일 인증하기</a>`
- Reset password의 링크:
  `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">비밀번호 재설정</a>`
- 이 링크는 서버에서 토큰을 검증하므로 다른 브라우저에서 메일을 여는 경우에도 PKCE 요청 브라우저 쿠키에만 의존하지 않는다. 만료·재사용 링크는 오류 안내로 이동한다. 템플릿 변경 후 실제 메일 1회 검증이 필요하다.
- 기존 로컬 이메일 계정/비밀번호/세션은 운영으로 복제하지 않는다. Google 사용자 표시명·기본지역·기본아바타는 기존 Auth metadata에서 최초 1회 가져온다. 로컬 업로드 사진과 로컬 글은 자동 이관하지 않는다.

참조: [Supabase 이메일 인증](https://supabase.com/docs/guides/auth/server-side/nextjs), [비밀번호 인증](https://supabase.com/docs/guides/auth/passwords), [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 3. R2 사진 저장

기준문서의 R2 구조를 유지한다. DB에는 사진 파일 대신 소유자·object key·MIME·크기만 저장한다.

Cloudflare R2에서 커뮤니티 사진 전용 bucket을 만든다. bucket 하나에 한정한 Object Read & Write S3 자격증명을 발급하여 서버 환경에 입력한다. 자격증명을 GitHub/채팅에 올리지 않는다. bucket에 공개 이미지용 custom domain을 연결하고 `R2_PUBLIC_URL`로 설정한다. 비공개 B2B 파일은 이 bucket에 넣지 않는다. 이번 어댑터는 Phase 1 공개 사진만 받는다.

필수 환경변수: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PUBLIC_URL` (HTTPS, 마지막 `/` 선택).

사진은 로그인·계정 제한 확인 후 서버에서 파일 크기/시그니처 검사, R2 업로드, DB metadata 등록 순으로 저장한다. metadata 실패 시 R2 파일 삭제를 시도한다. 최대 5MB, JPG/PNG/WebP; 글은 최대 5장. API는 공개 사진 전용이다. 프로필은 512×512, 글 사진은 긴 변 최대 1800px로 클라이언트에서 줄인다.

실패 시 서버 로그의 `Orphan image cleanup required` key를 확인한다. 취소한 업로드의 정기 정리·백업/보존기간·신고 사진 삭제 운영은 후속 설정이 필요하다. 공개 사진은 인터넷에서 열람 가능하며 게시글 숨김이 공개 URL 파일 삭제까지 수행하지는 않는다.

참조: [Cloudflare R2 S3 SDK](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).

## 4. 배포 환경

호스팅 프로젝트는 아직 확인되지 않았다. Vercel로 진행하는 경우 New Project → `gyroscopemooa/matda` → Next.js, Node 24, `npm run build`를 사용한다. 정적 export는 사용하지 않는다. 먼저 staging 주소에서 검증한다.

```dotenv
DATA_ADAPTER=supabase
NEXT_PUBLIC_RELEASE_PHASE=1
NEXT_PUBLIC_SITE_URL=https://matda.net
NEXT_PUBLIC_SUPABASE_URL=https://affpkizmmfnmvyexugdu.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=프로젝트의_공개키
PAYMENTS_ENABLED=false
TENDERS_ENABLED=false
ALLOW_LOCAL_PREVIEW=false
# 위 R2 환경변수도 추가
```

service-role key는 필요하지 않는다. 일반 요청은 인증된 사용자의 JWT와 RLS로 실행한다. 후속 Phase UI/원격 동작은 이 출시에서 열지 않는다. `npm run check:remote`는 환경변수 이름과 공개 스키마만 읽어 확인하며 실제 로그인/메일/R2/Realtime 통과를 의미하지 않는다.

0004는 직접 REST 호출로 후속 기능을 우회하지 못하도록 견적/BIZ/입찰 관련 쓰기와 RPC 실행 권한도 회수한다. 후속 Phase를 공개할 때는 환경변수만 올리지 말고 해당 단계 adapter·권한 migration·검증을 함께 적용한다.

배포한 사이트가 정상임을 확인한 다음 호스팅 Domains에 `matda.net`을 추가하고, 도메인 관리 화면에 **호스팅이 제시한 DNS 레코드**를 입력한다. DNS 주소를 추정해서 설정하지 않는다. HTTPS 발급 후 Site URL/Redirect URLs를 일치시키고 production 환경변수 반영 후 재배포한다.

검색엔진 noindex는 아직 유지한다. 약관·개인정보 안내·실제 문의 채널과 운영 책임자 확정, 아래 실제 검증 후 공개 검색 허용을 별도 적용한다.

## 5. 마지막 사용자 테스트 (연결 후 한 번에)

1. Google 계정 선택 → 로그인 → 로그아웃 → 다른 계정 선택. 이메일 가입 → 인증 → 로그인 → 비밀번호 재설정.
2. MY 닉네임·기본지역·3개 아바타·사진을 바꾸고 다른 브라우저 로그인에서도 유지되는지 확인.
3. 울산 전체/남구/야음동 필터, 해줘요·질문·후기·자유 작성/수정/삭제, 날짜/기간, 사진 5장.
4. 서로 다른 두 계정으로 댓글·채팅·알림. 두 창 동시 수신, 재연결, 읽음, 비참여자 접근 거부, 차단 후 전송 거부.
5. 관리자 신고 처리·숨김·복원·계정 제한. 모바일 360/390px과 PC에서 글쓰기/사진/로그인.

## 검증 범위와 남은 제한

- SQL 권한은 로컬 PGlite의 실제 Postgres RLS로 검증했다. Supabase 운영 JWT/메일/R2/Realtime 실접속 검증은 별도다.
- 앱 폴링은 채팅 5초, 로그인 상태 일반 화면 30초; Realtime 수신/재연결 시 갱신한다. 백그라운드 OS push는 없다.
- 현재 snapshot은 RLS로 읽을 수 있는 데이터를 페이지별로 전부 모은다. 데이터 증가 전 화면별 서버 pagination으로 전환해야 한다. 대규모 서비스 부하 통과를 주장하지 않는다.
- 서버 요청 제한은 프로세스 메모리 기반이다. 공개 확장 전에 공유 rate limit/봇 차단과 이메일 발송 정책을 별도 검증해야 한다.
- 자동 테스트 완료만으로 production 출시 승인이나 보안감사 완료를 의미하지 않는다.

## 2026-09-20 원격 DB 업그레이드 반영 확인
사용자 SQL 실행 후 공개 API 읽기 검증: profiles.avatar/disabled, posts.images/schedule/budget/service_mode, comments.status 조회 성공. consumer 활성 카테고리 6+기타 확인. 통합 SQL 마지막 단계 변경이 반영됨. media 조회는 비로그인 42501 권한 거부이므로 이 경로로 컬럼 검증 불가. 로그인 사용자 media/RLS·채팅 실동작은 추후 검증. R2 변수는 아직 없고 local adapter 유지. 운영 관리자 권한 부여는 별도 미완료.

## 2026-09-20 Supabase Storage 전환 준비
사용자가 community-images 버킷 생성 보고. 기본 사진 저장소를 Supabase Storage로 변경하며 R2 코드는 MEDIA_STORAGE_PROVIDER=r2로 유지. 파일별 storage_provider를 기록하여 기존 R2 사진은 R2로 조회한다. 공개 사진 리다이렉트는 공개 메타데이터 전용 RPC를 사용한다. 사진 2MiB 제한, JWT로 본인 경로 업로드/삭제, 업로드 metadata 실패 시 파일 정리. migration 0007_supabase_storage.sql을 SQL Editor에서 한 번 적용해야 한다(통합 UPGRADE_COMMUNITY 재실행 금지). 실제 원격 업로드는 SQL 적용 및 로그인 연결 후 검증해야 한다. local adapter는 유지했다. 28개 단위/DB 테스트에 Storage 소유자 격리·삭제 권한 및 새 SQL 검증 포함, 통과.

## 2026-09-20 Storage SQL 원격 반영 확인
사용자 성공 보고 후 공개 이미지 RPC community_public_image를 비로그인으로 호출하여 정상 응답/존재하지 않는 ID의 빈 결과 확인. profiles/posts/comments 스키마 정상, media 직접 조회는 비로그인 권한 차단(42501). migration0007의 RPC 배포 확인이며 실제 이미지 업로드·소유자 삭제·사진 표시 실검증 완료를 의미하지 않는다. 현재 앱은 local adapter 유지. 다음 작업은 원격 모드에서 로그인 및 사진 업로드 검증이다.


## 채팅 나가기 추가 적용
기존 0007까지 적용한 DB에서 supabase/migrations/0008_chat_leave.sql만 SQL Editor로 실행한다. 기존 대화와 메시지는 삭제하지 않는다. 적용 전에는 나가기 RPC가 없어 나가기 요청이 오류로 끝나며 기존 채팅은 유지된다.


## 채팅 종료/미리보기 최신 적용
0009_chat_close_preview.sql을 실행한다. 0008 내용을 포함하므로0008 미실행이어도0009만 적용 가능하다. 종료 상태/양방향 전송차단/알림 원문ID 추가. 자동 기록 삭제는 시행하지 않으며 보관기간 및 사용자 안내 정책은 별도 결정한다.


## 최신 로그인 정책: Google 전용
이메일 신규가입/로그인/메일 재설정은 운영 앱에서 차단한다. Supabase Sign In / Providers에서 Email Provider를 비활성화하고 Google은 유지한다. 기존 이메일 계정 데이터/세션은 삭제하지 않는다. SMTP 연결 작업은 보류.


## 운영팀 샘플 2개 등록
Supabase SQL Editor에서 supabase/migrations/0010_sample_posts.sql 실행. jeonmeensoo@gmail.com의 인증된 관리자 계정이 필요하다. 청소·관리/제작·디지털 샘플 각 1개를 추가하며 기존 글은 변경하지 않는다. 재실행해도 중복 생성되지 않는다. 적용 전에는 새 샘플이 보이지 않는다.


## 가이드 자동 초안·검색·사업자 영역
0011_guides_business.sql 실행 후 docs/GUIDE_SEO_BUSINESS_SETUP.md 순서대로 서버 Secret과 별도 예약 Worker 설정. 검색은 배포 설정에서 홈/공개 가이드만 허용하며 Google/네이버 소유권 확인·사이트맵 제출은 별도 필요. 실제 AI 호출과 매일 실행은 아직 설정 전이다.
