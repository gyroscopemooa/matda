# Codex GUI 작업방식

## 1. 매 세션 시작
- repo 검사
- git 상태 확인
- BUILD_PROGRESS 읽기
- DECISIONS_LOG 읽기
- 현재 Phase 문서 읽기
- 디자인 reference 실제 확인

## 2. 한 작업 단위
큰 Phase도 작은 milestone으로 나눈다.
예:
`Phase 2A quote DB → 2B provider submit → 2C comparison → 2D selection`

## 3. 작업 전 보고
- 현재상태
- 목표
- 수정파일
- DB 변경
- 테스트
- 위험

## 4. 작업 중
사용자가 중간에 디자인/정책을 바꾸면:
1. 현재 구현과 충돌 확인
2. 최소 영향 수정
3. DECISIONS_LOG 기록
4. 관련 문서 필요 시 갱신

## 5. 작업 종료
반드시:
- 테스트
- BUILD_PROGRESS 갱신
- 변경파일 요약
- 미해결
- 다음 추천

## 6. 시장 활성화와 개발
`사용자가 적다`는 이유만으로 다음 Phase를 멈추지 않는다.

기술적으로 완성해야 할 기본선:
- Community
- Consumer Quote
- Provider Marketplace
- MATDA BIZ Basic
- RFQ core

그 이후에도 사용자가 개발 지속을 원하면 진행하되, 결제/입찰 공개 등 외부 법무/계약 필요 영역은 feature flag로 둘 수 있다.

## 7. 디자인 수정
컨셉샷보다 구현이 투박하면:
- spacing
- hierarchy
- typography
- card density
- desktop composition
을 reference와 다시 비교한다.

단순히 기능이 된다는 이유로 디자인 QA를 건너뛰지 않는다.
