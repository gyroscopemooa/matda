# B2B 비교견적 / RFQ / 민간입찰 설계

## 1. 1·2·3의 차이
### 1. 업체/대행업체 구함
“이 일을 할 업체 있나요?”
- 글
- 업체 지원/채팅
- 가격 제출 필수 아님

난이도: 약 2/10

### 2. 비교견적 / RFQ
“같은 조건으로 가격·일정·범위를 제출해주세요.”
- 구조화 요청
- 3~5개 견적
- 발주기업만 견적 확인
- 업체간 가격 비공개

난이도: 약 4/10

### 3. 민간입찰
“정해진 규칙과 마감 아래 제안을 제출하고 마감 후 개찰/평가합니다.”
- 공고
- 참가조건
- 마감
- sealed bid
- 개찰
- 평가/선정
- 감사로그

간단 MVP 난이도: 약 6/10
나라장터급 고도화: 8~10/10

## 2. RFQ
필수:
- 제목
- 설명
- 서비스 카테고리
- 지역
- 마감일
- 첨부

선택:
- 참가조건
- 예산범위
- 수행기간
- 현장방문 여부
- 자격/등록

업체:
- 가격
- 기간
- 제안메시지
- 견적서/제안서

발주기업만 개별 견적을 본다.

## 3. Tender MVP — 민간 공개 제안입찰
처음에는 **한 방식만** 구현한다.

### 공고 생성
- title
- buyer organization
- category
- description/scope
- region/workplace
- eligibility text
- start_at
- deadline_at
- evaluation_method_text
- attachments
- contact policy

### 업체 투찰
- bid amount
- currency
- proposal message
- attachments
- eligibility docs
- submitted_at

### 봉인
마감 전:
- 다른 업체는 절대 다른 투찰정보를 볼 수 없음
- 기본적으로 발주기업도 가격/제안서 본문을 보지 않게 하는 sealed mode 권장
- 참여 업체 수 정도만 표시 가능

### 수정/철회
1차 권장:
- 마감 전 수정 가능
- 모든 버전 기록
- 최신 제출본만 유효
- 마감 전 철회 가능
- 마감 후 수정/철회 불가

### 마감
서버 시간이 기준.
DB에는 UTC 저장, UI는 사용자 지역시간으로 표시.

### 개찰
- deadline 이후 authorized buyer가 `개찰` 실행
- 개찰 시각/실행자 audit log
- 이후 견적/제안 표시

### 평가
1차에서는 자동낙찰 금지.
발주기업이 가격/실적/조건 등을 보고 직접 선정.

상태:
`draft → published → open → closed → opened → evaluating → awarded`

예외:
`cancelled / failed / no_award`

## 4. 파일
우리 서비스가 만들어야 할 것:
- 업로드
- 권한
- 다운로드
- 미리보기 가능한 형식의 기본 preview
- 버전/파일명/크기

만들 필요 없는 것:
- CAD 제작기
- DWG 편집기
- Excel 편집기
- PDF 편집기

DWG/ZIP 등은 opaque file attachment로 처리 가능.

## 5. 추후 확장
- 제한입찰
- 초대/지명입찰
- Q&A 기간
- 현장설명회 일정
- 평가표
- 우선협상
- 재입찰
- 유찰 자동처리
- 전자계약

## 6. 공공조달과 경계
MATDA Tender는 **민간 기업용 전자입찰**이다.
공공기관이 법적으로 나라장터 등 지정 절차를 써야 하는 계약의 공식 대체서비스라고 표현하지 않는다.

외부 공공입찰은 향후:
- 정보 제공
- 알림
- 공식 제출처 링크
정도로 연결 가능.

## 7. 대기업 자체구매와 관계
대기업 자체 SRM/e-Procurement가 있는 경우 MATDA가 공식 최종 투찰처가 아닐 수 있다.
그런 기업에도:
- 신규 공급업체 발굴
- 사전 RFI
- 공급자 pool 구성
등으로 활용 가능.
