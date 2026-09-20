begin;
alter table public.posts add column if not exists is_sample boolean not null default false;
create or replace function public.community_sample_guard() returns trigger language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is not null and not community_admin() and (new.is_sample or (tg_op='UPDATE' and old.is_sample)) then raise exception 'Only admins manage samples'; end if;
 return new;
end$$;
drop trigger if exists community_sample_guard on public.posts;
create trigger community_sample_guard before insert or update on public.posts for each row execute function public.community_sample_guard();
create or replace function public.community_sample_interaction_guard() returns trigger language plpgsql security definer set search_path=public as $$begin
 if exists(select 1 from posts where id=new.post_id and is_sample) then raise exception 'Sample posts do not accept conversations or comments'; end if;
 return new;
end$$;
drop trigger if exists community_sample_comment on public.comments;
create trigger community_sample_comment before insert on public.comments for each row execute function public.community_sample_interaction_guard();
drop trigger if exists community_sample_chat on public.conversations;
create trigger community_sample_chat before insert or update on public.conversations for each row execute function public.community_sample_interaction_guard();
alter table public.posts alter column author_id drop not null;
alter table public.posts drop constraint if exists posts_real_author_required;
alter table public.posts add constraint posts_real_author_required check (is_sample or author_id is not null);
insert into public.posts(id,author_id,post_type,audience,category_id,title,body,region,service_mode,is_sample,schedule)
values
('e739cc21-7758-4d87-bd11-29a69b050a11',null,'request','consumer','제작·디지털','[예시] 작은 가게 소개 홈페이지 제작 해줘요',E'해죠 운영팀이 제공하는 작성 예시입니다. 실제 작업을 모집하지 않습니다.\n\n작은 공방을 소개하는 홈페이지를 만들고 싶어요. 가게 소개, 작업 사진, 자주 묻는 질문, 문의 링크가 필요하고 휴대폰에서도 보기 편했으면 합니다.\n\n로고와 사진은 제공할 수 있어요. 가능한 일정, 제작 범위, 수정 횟수, 유지관리와 결과물 전달 방식을 알려주세요. 온라인으로 협의 가능합니다.','전국 · 온라인','online',true,'{"scheduleMode":"flexible"}'),
('e739cc21-7758-4d87-bd11-29a69b050a12',null,'question','consumer','이사·운송','[예시] 용달 문의할 때 어떤 사진을 준비하면 좋을까요?',E'해죠 운영팀이 제공하는 질문 작성 예시입니다. 실제 사용자의 질문이 아닙니다.\n\n책상과 의자, 작은 서랍장을 옮기려고 하는 상황입니다. 물건 전체 사진 외에 크기나 분해 가능 여부도 알려드려야 할까요?\n\n출발지와 도착지의 층수, 엘리베이터 유무, 차량 접근 가능 여부 중 어떤 정보를 미리 정리하면 작업 범위를 정확히 전달할 수 있을지 궁금합니다. 공개 글에는 상세주소를 적지 않고 상담 때 전달하려고 해요.','전체 지역','local',true,'{"scheduleMode":"flexible"}'),
('e739cc21-7758-4d87-bd11-29a69b050a13',null,'review','consumer','청소·관리','[예시] 입주청소 후기, 이렇게 정리해보세요',E'해죠 운영팀의 후기 작성 양식입니다. 실제 거래·이용 후기가 아니며 특정 업체를 추천하지 않습니다.\n\n실제 서비스를 이용한 뒤 아래 항목을 본인의 경험에 맞게 채워주세요.\n\n1. 요청한 작업: 집의 면적과 청소를 부탁한 공간\n2. 사전에 합의한 범위: 포함된 작업과 제외된 작업\n3. 진행 과정: 일정 안내, 연락, 현장 확인 경험\n4. 완료 후 확인: 직접 확인한 결과와 추가로 요청한 부분\n5. 다음 이용자를 위한 팁: 미리 준비하면 좋았던 정보\n\n개인 연락처나 상세주소는 공개하지 말고, 직접 경험한 사실을 중심으로 적어주세요.','전체 지역','local',true,'{"scheduleMode":"flexible"}')
on conflict(id) do nothing;
commit;
