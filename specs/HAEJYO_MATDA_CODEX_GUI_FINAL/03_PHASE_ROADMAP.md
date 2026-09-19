# 단계별 개발 로드맵

## Phase 0 — Foundation
목표: 나중에 UI를 다시 디자인해도 기능을 재사용할 수 있는 기반.

- 기존 repo 분석
- 디자인 토큰
- 공통 레이아웃
- Auth 기반
- DB migration 체계
- RLS 기본
- feature flags
- brand config
- route skeleton
- BUILD_PROGRESS 자동/수동 갱신 규칙

통과 후 Phase 1로 이동.

---

## Phase 1 — Community MVP
### 목표
글/댓글/채팅으로 사람·업체를 가볍게 연결.

필수:
- 회원가입/로그인
- 지역 선택
- 홈 피드
- 구해요/질문/후기
- 글쓰기/수정/삭제
- 사진
- 댓글
- 좋아요/관심(선택)
- 내부채팅
- MY
- 신고/차단 최소기능
- 모바일/PC 반응형

### 중요한 것
견적 시스템처럼 무겁게 보이지 않는다.

---

## Phase 2 — Consumer Quotes
기존 `구해요` 글에 견적 기능을 붙인다.

- 견적 활성화
- 견적 5개 기본/10개 최대
- 72시간
- 연장
- 업체 견적 제출
- 견적 템플릿
- 비교
- 채팅
- 업체 선택
- 연락처 해제 정책
- 거래 자가확인
- 후기

커뮤니티 UI 삭제 금지.

---

## Phase 3 — Provider Marketplace
- 업체 프로필
- 서비스/지역
- 포트폴리오
- 후기
- 인증상태
- 업체 검색
- 업체에게 직접 요청
- 업체 MY/통계

이 시점부터 홈에서는 업체찾기가 Promoted될 수 있다.

---

## Phase 4 — MATDA BIZ Basic
- `/biz`
- 기업 역할/조직
- 기업 구해요
- B2B 카테고리
- 기업↔업체 채팅
- B2B 간단 견적
- 업체 자격/등록 정보

소비자 기능과 동일한 공통 엔진을 최대한 재사용.

---

## Phase 5 — B2B RFQ + Workplace/Contract
### RFQ
- 상세 요구조건
- 마감일
- 비공개 견적
- 업체별 첨부문서
- 조건 비교

### 사업장/계약
- 여러 사업장
- 담당 대행업체
- 계약기간
- 계약서
- D-day
- 점검일
- 재견적
- 재계약

---

## Phase 6 — Private Tender MVP
입찰은 별도 모듈.

1차는 `민간 공개 제안입찰`만 구현.
- 공고
- 참가조건
- 마감
- sealed bid
- 첨부
- 개찰
- 평가
- 선정
- 취소/유찰
- 감사로그

시장 활성화 여부와 무관하게 소프트웨어 구현은 가능하지만, 실서비스 공개 전 법무/약관 검토가 필요하다.

---

## Phase 7 — Admin/SEO/Operational Hardening
- 업체 인증 운영
- 관리자 대시보드
- 신고/제재
- SEO 랜딩
- 검색 품질
- 성능/보안
- 이벤트 분석

---

## Phase 8 — Payment/Settlement (Feature Flag)
거래가 유료화될 때 활성화.
- payment provider abstraction
- shadow ledger
- 수수료 계산
- 환불
- 정산예정
- reconciliation

실제 자금보관/지급 방식은 결제사/규제 검토 후 결정.

---

## Phase 9 — App Readiness / PWA / Native
웹 모바일 UX를 완성한 뒤:
- PWA 가능성
- 푸시
- Expo/React Native 앱 검토
- 공통 API/타입/디자인토큰 공유

웹을 그대로 WebView에 억지로 넣는 것을 기본전략으로 삼지 않는다.

## 2026-09-20 후속 전환 결정
민간 견적 단계의 커뮤니티 역할 변경은 `../../docs/CONSUMER_PLATFORM_TRANSITION.md`를 함께 따른다. 해줘요 요청은 작성자 선택으로 견적 요청에 통합하고 질문/후기는 유지한다. 업체찾기 Phase 3, BIZ Phase 4 노출 원칙을 유지한다. 이번 변경은 문서 계획만 저장한다.
