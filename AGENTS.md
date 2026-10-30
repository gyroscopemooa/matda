<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 공개 범위와 Git push 규칙 (2026-09-20)

- 현재 공개 승인 범위는 Phase 1 커뮤니티다. Phase 2 견적은 내부 개발만 진행하며, 공개 여부는 커뮤니티 활성화와 업체 응답 준비를 검토한 뒤 사용자가 별도로 결정한다.
- 로컬 `npm run dev`/`npm run preview`는 구현된 후속 기능을 준비 중 화면 없이 테스트할 수 있게 한다. 로컬 어댑터·로컬 데이터·루프백 주소로 분리하고 실제 결제는 비활성으로 유지한다. 공개 상태 재현은 `npm run preview:release`를 사용한다. 로컬 개발 설정을 운영 빌드/배포 설정으로 옮기지 않는다.
- 로컬 커밋과 원격 push·배포는 별도 작업이다. 개발 진행/완료/로컬 커밋 요청을 push 승인으로 해석하지 않는다. 현재 작업에 대한 명시적 push 승인이 있을 때만 원격으로 전송한다.
- `main` push는 연결된 Cloudflare 배포를 유발할 수 있으므로 배포 행위로 취급한다. 이전 작업의 push 승인을 다음 작업에 재사용하지 않는다.
- push 전 대상 브랜치·원격·커밋 목록·diff를 확인하고, `wrangler.jsonc`, 빌드 스크립트, 공개 환경변수, UI/서버 기능 제한과 SQL 공개 플래그가 승인된 범위를 유지하는지 확인한다.
- Phase 1 유지 시 `NEXT_PUBLIC_RELEASE_PHASE=1`, 결제/입찰 비활성, 원격 Phase 1 제한 및 `consumer_quotes_enabled=false`를 유지한다. 준비 중 메뉴는 허용하며 실제 견적 모집·제출·선택은 공개하지 않는다.
- push 전 운영 화면과 API를 읽기 전용으로 확인한다: `/quotes` 준비 중, `/quotes/new` 및 `/biz/rfqs` 차단, `/api/app` 정상 응답. 확인 불가/결과 불일치 시 이를 해결하거나 사용자에게 알리고 push를 보류한다.
- push 승인과 신규 기능 공개 승인은 별개다. 닫기 위한 push 승인은 기능 공개·운영 SQL 적용·다음 작업의 push까지 허용하지 않는다.
- push 후 원격 커밋·배포 결과·실제 화면을 확인하고, 확인하지 못한 상태를 배포 성공으로 보고하지 않는다.
- 다른 도구/프로세스가 커밋이나 push한 정황이 있으면 Git log/reflog와 원격 ref를 확인한다. 자신이 push하지 않았다는 이유만으로 로컬에만 저장됐다고 단정하지 않는다.

## 커뮤니티 수동 콘텐츠 운영

- 2026-10-30 사용자 정정: “수동”은 사용자 요청으로 에이전트가 실행한다는 뜻이다. “지금 업데이트/지금 커뮤 글 작성해줘” 요청은 해당 콘텐츠의 실제 게시와 필요한 선별 커밋·Git push·운영 배포·운영 확인까지 포함한다. 원고에서 멈추거나 게시 승인을 반복 요청하지 않는다. Phase 1 제한, 중복 방지, push 전후 검증은 유지하며 실제 인증·권한 장애만 보고한다. 유료 API·무인 예약 자동화·외부 커뮤니티 게시 승인은 포함하지 않는다.

- 사용자가 “지금 커뮤 글 작성해줘” 등 콘텐츠 작성을 요청하면 `docs/community-editorial.md`의 작성·검증·연결 기준을 따른다. 검색 수요 근거를 꾸미지 말고 기존 글 개선을 먼저 검토한다.
- 게시판 구축 요청을 대량 글 생성, 유료 AI API 호출, 자동·예약 발행 또는 외부 커뮤니티 게시 승인으로 해석하지 않는다.
