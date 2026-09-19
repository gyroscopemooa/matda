# 채팅 / 알림 / 이미지·첨부

## 1. 채팅
초기:
- 1:1
- request-linked conversation
- 텍스트
- 읽음/안읽음
- 차단/신고

후기:
- 이미지
- 파일
- quote card share

## 2. Realtime
Supabase Realtime 사용 가능.
초기 동접/메시지 한도를 모니터링.

## 3. 알림
초기 in-app:
- 댓글
- 새 견적
- 채팅
- 업체선택
- 견적 만료

추후 이메일/푸시.
SMS/Kakao는 비용이 발생하므로 나중.

## 4. 이미지 R2
정책 예:
- 일반글 5장
- 견적요청 8장
- 후기 10장
- 업체 포트폴리오 20장

업로드 시:
- MIME 검증
- size limit
- resize/compress
- orphan cleanup

## 5. B2B 첨부
공개 이미지와 완전히 구분.
- private bucket/prefix
- signed URL
- 다운로드 로그 선택

파일 종류:
PDF, XLS/XLSX, DOC/DOCX, ZIP, JPG/PNG/WebP, DWG 등.

위험 executable은 기본 차단.

## 6. 악성파일
실서비스 고도화 시 antivirus scanning pipeline 검토.
초기에는 확장자/MIME/크기 제한과 다운로드 경고.
