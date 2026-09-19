# 테스트 / 릴리스 게이트

## 공통
모든 화면은 아래 상태를 갖는다.
- loading
- empty
- success
- error
- permission denied

## Phase 0
- build 성공
- lint/typecheck
- env validation
- design token 적용
- route shell

## Phase 1
- 회원가입/로그인
- 글 CRUD
- 이미지
- 필터/검색
- 댓글
- 채팅
- MY
- 신고/차단
- mobile/desktop

## Phase 2
- quote enable
- 72시간
- 5개/10개
- 연장
- 업체견적
- 비교
- 선택
- 연락처 unlock
- 거래확인
- 후기

## Phase 3
- provider profile
- search
- portfolio
- verification badge
- provider MY

## Phase 4
- org
- `/biz`
- 기업요청
- B2B quote
- permission
- 소비자 기능 회귀테스트

## Phase 5
- RFQ deadline
- proposal privacy
- workplaces
- contracts
- reminder

## Phase 6 Tender
반드시 테스트:
- deadline 전 제출
- deadline 직후 제출 차단
- 수정버전
- 철회
- 다른 bidder 접근 차단
- buyer pre-deadline 접근 정책
- 개찰 권한
- audit log
- cancel/failed/no-award
- time zone

## Security
- RLS negative test
- IDOR 방지
- private file signed URL
- XSS
- upload validation
- spam/rate limit

## Regression
새 Phase 완료 시 이전 핵심 플로우 모두 smoke test.

## 완료 판정
코드 생성만으로 DONE 금지.
테스트 결과를 BUILD_PROGRESS에 기록한 뒤 완료.
