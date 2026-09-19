# 최종 Acceptance Test Matrix

| 영역 | 시나리오 | 기대결과 |
|---|---|---|
| Auth | 일반 가입 | 프로필 생성 |
| Community | 구해요 등록 | 즉시 피드 노출 |
| Community | 정보 적게 입력 | 등록 가능 |
| Media | 큰 사진 | 압축/제한 정상 |
| Chat | 비참여자 접근 | 차단 |
| Quote | 1~5번째 견적 | 정상 제출 |
| Quote | 6번째 기본상태 | 차단/추가오픈 안내 |
| Quote | +5 활성화 | 최대 10 허용 |
| Quote | 72시간 만료 | 새 제출 차단 |
| Quote | 24시간 연장 | expires_at 갱신 |
| Contact | 선택 전 | 연락처 비공개 |
| Contact | 선택 후 | 정책에 따라 unlock |
| Trade | 업체 선택 | completed로 자동처리 안 됨 |
| Provider | 인증 pending | verified badge 없음 |
| Provider | 승인 | 정확한 badge |
| BIZ | 일반사용자 org data | 접근 차단 |
| RFQ | 타 업체 제안서 | 접근 불가 |
| Tender | 마감 전 타 bid | 접근 불가 |
| Tender | deadline 후 투찰 | 거절 |
| Tender | 수정 | version 기록 |
| Tender | 개찰 | 권한자만 가능 |
| Tender | 선정 | audit log 기록 |
| Files | private document direct URL | 권한 없으면 접근 불가 |
| SEO | post/provider public page | 올바른 meta |
| Responsive | 360px | overflow 없음 |
| Responsive | desktop | 지나친 빈폭/과대폭 없음 |
| Regression | BIZ 추가 후 consumer flow | 정상 |
