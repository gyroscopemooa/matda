# 관리자 / 운영 / 분석

## 1. 관리자 MVP
- 사용자 검색
- 글/댓글 신고
- 숨김/삭제
- 계정 제한
- 업체 인증 검토
- 문의

## 2. Provider Verification
관리자 화면:
- 사업자 문서
- 등록/자격 문서
- 검증종류
- 유효기간
- 승인/반려
- 내부메모

## 3. BIZ
- 조직 검증
- RFQ 신고
- 입찰 공고 신고/정지
- 분쟁 기록

관리자가 sealed bid를 마감 전에 임의로 열람할 수 없도록 권한설계를 신중히 한다.

## 4. 핵심 이벤트 분석
### Community
- signup
- post_created
- comment_created
- chat_started

### Quote
- quote_request_enabled
- quote_received
- quote_viewed
- provider_selected
- trade_confirmed
- review_created

### Provider
- profile_completed
- verification_requested
- quote_template_saved

### BIZ
- biz_request_created
- rfq_created
- proposal_submitted
- contract_created
- tender_published
- bid_submitted
- tender_awarded

## 5. 핵심 퍼널
`요청글 → 견적 1개 이상 → 채팅 → 업체선택 → 실제거래 → 후기`

## 6. KPI가 낮을 때
개발 중단이 아니라:
- 시드콘텐츠
- 업체 모집
- onboarding
- 카테고리 축소
- CTA 위치
- 검색/SEO
개선안을 추천하면서 로드맵 개발을 진행.
