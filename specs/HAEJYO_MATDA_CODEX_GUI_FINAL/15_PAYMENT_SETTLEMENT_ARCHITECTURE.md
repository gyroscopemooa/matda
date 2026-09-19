# 결제 / 정산 아키텍처

## 1. 핵심 수정사항
**초기부터 PG 분리정산을 필수 전제로 하지 않는다.**

세 가지를 분리한다.
1. 결제수단
2. 내부 정산계산/원장
3. 실제 지급

MVP는 무료이므로 결제 자체를 활성화하지 않아도 된다.

## 2. 초기 유료화 후보
- 업체 구독
- 상단노출
- CRM
- 기업계약관리
- 플랫폼결제 선택

## 3. Shadow Ledger
실제 돈을 직접 보관하지 않아도 거래별 계산원장은 필요하다.

예시 필드:
- transaction/order_id
- gross_amount
- currency
- discount_amount
- refund_amount
- payment_fee
- platform_fee
- seller_gross
- withholding_tax
- seller_net
- settlement_status
- settlement_due_date
- settled_at
- payment_provider_ref

## 4. 정산예정금
업체/전문가 UI에서는:
`정산예정금`

금지/초기 미구현:
- 충전캐시
- 사용자간 송금
- 양도 가능한 잔액
- 자체 지갑

## 5. 지급 발전
가능한 기술 로드맵:
1. 규정상 허용되는 단순/수동 지급
2. 은행 대량이체
3. 은행 API/오픈뱅킹
4. PG 지급대행/분리정산
5. 자동대사/reconciliation
6. 복수 provider

단, 각 단계 실제 자금흐름은 계약 PG/은행과 법무 검토 후 활성화.

## 6. Provider Adapter
애플리케이션 로직과 지급수단을 분리.

예:
`PaymentProvider`
- createPayment
- getPaymentStatus
- refund

`PayoutProvider`
- createPayout
- getPayoutStatus

초기 provider가 없어도 mock 구현 가능.

## 7. 세금
3.3%를 전 사용자에게 하드코딩하지 않는다.
- 개인 전문가
- 사업자
- 과세/면세
- 소득 종류
등에 따라 달라질 수 있음.

세무정보는 설정/관리 영역에서 처리하고 출시 시 전문가 검토.

## 8. 앱스토어 결제
실제 서비스 종류에 따라 Google/Apple 정책이 다를 수 있다.
물리적 서비스/1:1 실시간 서비스 등의 규정은 출시시점 최신 정책을 재확인.

## 9. Polar
마켓플레이스/인적 서비스에 적합한지 최신 AUP를 출시 시점 재확인.
기본 결제수단으로 하드코딩하지 않는다.

## 10. 핵심 원칙
`자체원장`과 `자체 자금보관/정산`은 별개다.
원장은 초기부터 가능.
실제 돈 보관은 별도 규제 검토 없이 하지 않는다.
