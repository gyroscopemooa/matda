# 데이터 모델 / 보안 / RLS

## 1. 원칙
커뮤니티·민간견적·BIZ를 완전히 별도 DB로 만들지 않는다.
공통 코어 + audience/type/feature table로 확장한다.

## 2. 핵심 테이블
### users/profiles
- user_id
- display_name
- avatar
- default_region
- contact info private
- role flags

### organizations
- id
- business name
- business number metadata
- verification status

### organization_members
- org_id
- user_id
- role: owner/admin/member/procurement

### workplaces
- org_id
- name
- region/address
- industry metadata

### categories
- id
- domain: consumer/business
- parent_id
- slug
- active
- sort

### posts
- author_id
- post_type
- audience
- category_id
- title
- body
- region
- status
- quote_enabled

### comments
- post_id
- author_id
- body
- parent_id nullable

### media
- owner_type
- owner_id
- object_key
- visibility
- mime
- size
- width/height

### quote_requests
- post_id
- expires_at
- quote_limit
- extension_count
- state

### quotes
- request_id
- provider_id/org_id
- amount integer
- currency
- message
- available_date
- duration
- scope_json
- extra_cost_note
- status

### quote_templates
- provider_id
- category
- template fields

### provider_profiles
- user/org
- intro
- regions
- categories
- verification_state

### provider_verifications
- type
- document reference
- issued/expiry
- checked_by
- checked_at
- state

### conversations/messages
- participants
- linked_post/request/rfq/tender
- attachment metadata

### selections
- request
- selected provider
- customer_selected_at
- provider_accepted_at
- contact_unlocked_at

### trade_confirmations
- customer response
- provider response
- completed_at

### reviews
- request
- reviewer
- provider
- rating
- body
- media

## 3. B2B RFQ
### rfqs
- organization_id
- workplace_id
- category
- title/scope
- deadline
- eligibility_json/text
- status

### rfq_proposals
- rfq_id
- provider_org
- amount
- proposal
- attachments
- status

## 4. Tender
### tenders
- buyer_org
- title
- scope
- category
- region/workplace
- start_at
- deadline_at
- tender_type
- sealed_mode
- evaluation_method
- status

### bids
- tender_id
- bidder_org
- current_version_id
- status

### bid_versions
- bid_id
- version
- amount
- proposal
- submitted_at
- withdrawn_at

### bid_attachments
- bid_version_id
- private media ref

### tender_audit_logs
- actor
- action
- entity
- timestamp
- metadata

로그는 일반 UI에서 삭제할 수 없게 설계.

## 5. 계약
contracts / contract_files / contract_reminders

## 6. 미래 Payment/Ledger
별도 문서 참조.

## 7. RLS
반드시 서버권한에만 의존하지 말고 DB RLS 적용.

예:
- private quote는 작성업체 + 요청작성자만
- 채팅은 참여자만
- 기업 내부 사업장/계약은 org member만
- sealed tender bid는 deadline 전 권한에 맞게 차단
- 입찰첨부는 private

## 8. 민감파일
B2B 견적서/도면/계약서는 public URL 금지.
Signed URL을 짧은 TTL로 발급.
파일접근 전에 app-level 권한 + RLS/DB 검증.

## 9. 금액
KRW는 integer로 저장.
다중통화 가능성을 위해 currency 컬럼.
float 사용 금지.

## 10. 시간
DB UTC 저장.
화면에서 locale timezone 변환.
입찰 마감은 서버시간 기준.
