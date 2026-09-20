-- Requires 0010_sample_posts.sql and 0011_guides_business.sql.
begin;
-- A system example has no login account. Real posts still require an author.
alter table public.posts alter column author_id drop not null;
alter table public.posts drop constraint if exists posts_real_author_required;
alter table public.posts add constraint posts_real_author_required check (is_sample or author_id is not null);
insert into public.posts(id,author_id,post_type,audience,category_id,title,body,region,service_mode,is_sample,schedule,community_sector,community_purpose)
values
('a6dd4f35-378a-4567-9e02-6bb6b8d97831',null,'request','consumer','전기·에너지','사업장 전기안전관리 대행업체 구합니다',E'이 글은 시스템이 제공하는 작성 예시입니다. 실제 업체를 모집하지 않습니다.\n\n울산에 있는 사업장의 전기안전관리 대행을 상담하고 싶습니다. 시설과 설비 정보는 상담 과정에서 전달하고, 필요한 자격과 업무 범위를 먼저 확인하려고 합니다.\n\n관리 대상과 방문 주기, 점검 기록 제공 방식, 긴급 상황 대응 범위, 비용에 포함되거나 제외되는 업무를 설명해주세요.\n\n[작성 팁] 사업장 용도, 설비 현황, 기존 관리 여부와 희망 시작 시점을 정리하면 상담에 도움이 됩니다. 공개 글에는 상세주소나 내부 설비 자료를 올리지 마세요.','울산광역시','local',true,'{"scheduleMode":"flexible"}','business','general'),
('fb87a21f-ea58-4f97-b5d8-a7e2d66c9412',null,'request','consumer','제작·디지털','온라인 판매용 제품 촬영 업체 구합니다',E'이 글은 시스템이 제공하는 작성 예시입니다. 실제 업체를 모집하지 않습니다.\n\n소규모 브랜드의 제품 8종을 촬영할 업체나 프리랜서를 찾는 상황입니다. 흰 배경의 제품 사진과 사용 장면 사진이 필요하고, 온라인 상담과 제품 택배 전달이 가능합니다.\n\n제품별 납품 장수, 보정 범위, 수정 횟수, 일정, 원본 제공 여부와 사진 이용 범위를 알려주세요. 소품이나 배송 비용이 별도인지도 확인하고 싶습니다.\n\n[작성 팁] 제품 크기·재질·수량과 참고 사진, 사용할 채널을 함께 설명하면 작업 범위를 맞추기 쉽습니다.','전국 · 온라인','online',true,'{"scheduleMode":"flexible"}','business','general')
on conflict(id) do nothing;
commit;
