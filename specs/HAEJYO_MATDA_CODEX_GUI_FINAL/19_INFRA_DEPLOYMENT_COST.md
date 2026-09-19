# 인프라 / 배포 / 초기 비용

## 1. 권장
- Frontend: Next.js
- DB/Auth/Realtime: Supabase
- DNS/CDN: Cloudflare
- Images/files: Cloudflare R2
- Bot protection: Turnstile

기존 프로젝트가 이미 다른 안정적 스택이면 무리하게 변경하지 않는다.

## 2. 무료구간 전략
초기 활성화 검증까지 무료/저비용을 목표로 한다.
사진을 DB storage에 과도하게 저장하지 않는다.

## 3. 이미지
R2에 저장.
DB는 metadata/key만.

## 4. private B2B file
consumer public media와 bucket/prefix 정책 분리.

## 5. 환경변수
`.env.example` 유지.
secret은 코드/문서에 넣지 않는다.

## 6. 배포
각 Phase마다 preview/staging 확인 후 production.
DB migration은 되돌릴 수 있는 전략 고려.

## 7. 외부 서비스 연결이 아직 없을 때
에이전트는 작업을 멈추지 말고:
- local/mock adapter
- TODO checklist
- exact env name
- dashboard에서 사용자가 할 클릭 단계
를 남긴다.
