# Prompt 08 — Payment/Settlement Future

결제를 바로 production 활성화하지 않는다.

`15_PAYMENT_SETTLEMENT_ARCHITECTURE.md`를 기준으로:
- ledger schema
- interfaces/adapters
- feature flags
- mock provider
- refund/reconciliation state
만 안전하게 준비한다.

실제 PG/은행 연결은 계정/계약/법무 확인 후 별도 작업.
