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
do $$
declare owner_uid uuid;
begin
 select u.id into strict owner_uid from auth.users u join public.profiles p on p.id=u.id join public.community_admins a on a.user_id=u.id where lower(u.email)='jeonmeensoo@gmail.com' and u.email_confirmed_at is not null;
 insert into public.posts(id,author_id,post_type,audience,category_id,title,body,region,service_mode,is_sample,schedule)
 values
 ('8cc46960-2ef1-46e4-a4c5-dcc922a7d941',owner_uid,'request','consumer','청소·관리','이사 전 빈집 청소 도와주실 분 해줘요',E'이 글은 작성 예시입니다. 실제 작업을 모집하지 않습니다.\n\n울산 남구의 24평 아파트입니다. 가구가 없는 상태에서 주방, 욕실 2곳, 창틀과 베란다 청소를 부탁드리고 싶어요.\n\n가능한 작업일, 작업 인원, 예상 소요시간과 청소 범위를 알려주세요. 추가 비용이 발생하는 조건도 함께 적어주시면 비교하기 편할 것 같아요.\n\n[작성 팁] 면적·현재 상태·원하는 범위를 적고 사진을 첨부하면 도움이 됩니다.','울산광역시 남구','local',true,'{"scheduleMode":"flexible"}'),
 ('7989d9b7-d088-4b33-8cef-df9d08d2c0db',owner_uid,'request','consumer','제작·디지털','작은 가게 소개 홈페이지 제작 해줘요',E'이 글은 작성 예시입니다. 실제 작업을 모집하지 않습니다.\n\n작은 공방을 소개하는 홈페이지를 만들고 싶어요. 소개, 작업 사진, 자주 묻는 질문, 문의 링크가 필요합니다. 휴대폰에서도 보기 편했으면 좋겠어요.\n\n로고와 사진은 제공할 수 있고 온라인으로 협의 가능합니다. 제작 범위와 일정, 수정 횟수, 유지관리 비용 및 결과물 전달 방식을 알려주세요.\n\n[작성 팁] 필요한 화면·기능과 제공할 자료를 구체적으로 적어주세요.','전국 · 온라인','online',true,'{"scheduleMode":"flexible"}')
 on conflict(id) do nothing;
end$$;
commit;
