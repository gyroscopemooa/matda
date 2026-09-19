-- Apply once after migrations 0001-0003. See docs/COMMUNITY_LAUNCH.md.
begin;
alter table profiles add column avatar text not null default 'sun';
alter table profiles add column disabled boolean not null default false;
alter table posts add column images uuid[] not null default '{}';
alter table posts add column schedule jsonb not null default '{}';
alter table posts add column budget bigint check(budget>=0);
alter table posts add constraint post_image_limit check(cardinality(images)<=5);
alter table comments add column status text not null default 'published' check(status in ('published','hidden'));
alter table notifications add column target_id uuid;
alter table media add column created_at timestamptz not null default now();
alter table reports add column created_at timestamptz not null default now();
create table public.community_admins(user_id uuid primary key references auth.users(id));
alter table community_admins enable row level security;
revoke all on community_admins from anon,authenticated;
create function public.community_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from community_admins where user_id=auth.uid())$$;
create function public.community_active() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and not disabled)$$;
create function public.community_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from blocks where (owner_id=a and target_id=b) or (owner_id=b and target_id=a))$$;
revoke all on function community_admin(),community_active(),community_blocked(uuid,uuid) from public;
grant execute on function community_admin(),community_active(),community_blocked(uuid,uuid) to authenticated;
revoke insert,update,delete on profiles from authenticated;
grant insert(id,display_name,region,avatar),update(display_name,region,avatar) on profiles to authenticated;
create function public.community_profile_guard() returns trigger language plpgsql security definer set search_path=public as $$begin
 if length(trim(new.display_name)) not between 1 and 20 or length(new.region)>80 then raise exception 'Invalid profile'; end if;
 if new.avatar not in ('sun','leaf','smile') and not exists(select 1 from media where id::text=substring(new.avatar from 7) and new.avatar like 'media:%' and owner_id=new.id and visibility='public' and mime in ('image/jpeg','image/png','image/webp')) then raise exception 'Invalid avatar'; end if;
 return new; end$$;
create trigger community_profile_check before insert or update on profiles for each row execute function community_profile_guard();
drop policy profile_update on profiles;
create policy profile_update on profiles for update using(id=auth.uid() and not disabled) with check(id=auth.uid() and not disabled);
insert into categories(id,domain,name,sort) values ('청소','consumer','청소',1),('이사·운송','consumer','이사·운송',2),('수리·설치','consumer','수리·설치',3),('인테리어·시공','consumer','인테리어·시공',4),('자동차','consumer','자동차',5),('기타','consumer','기타',6) on conflict(id) do nothing;
drop policy posts_read on posts;
create policy posts_read on posts for select using(status='published' or author_id=auth.uid());
create policy posts_admin_read on posts for select to authenticated using(community_admin());
drop policy posts_create on posts;
create policy posts_create on posts for insert to authenticated with check(author_id=auth.uid() and community_active() and audience='consumer' and org_id is null and status='published');
drop policy posts_edit on posts;
create policy posts_edit on posts for update to authenticated using(author_id=auth.uid() and community_active() and status='published') with check(author_id=auth.uid() and community_active() and status in ('published','deleted') and audience='consumer' and org_id is null);
create function community_post_guard() returns trigger language plpgsql security definer set search_path=public as $$begin
 if length(trim(new.body)) not between 1 and 5000 or length(new.title)>120 or length(new.region) not between 1 and 80 then raise exception 'Invalid post'; end if;
 if exists(select 1 from unnest(new.images) i where not exists(select 1 from media m where m.id=i and m.owner_id=new.author_id and m.visibility='public' and m.mime in ('image/jpeg','image/png','image/webp'))) then raise exception 'Invalid images'; end if;
 return new; end$$;
create trigger community_post_check before insert or update on posts for each row execute function community_post_guard();
drop policy comments_read on comments;
create policy comments_read on comments for select using(status='published' and exists(select 1 from posts where id=post_id and status='published'));
create policy comments_admin_read on comments for select to authenticated using(community_admin());
drop policy comments_create on comments;
create policy comments_create on comments for insert to authenticated with check(author_id=auth.uid() and community_active() and status='published' and length(trim(body)) between 1 and 2000 and exists(select 1 from posts where id=post_id and status='published' and not community_blocked(author_id,auth.uid())));
create policy media_create on media for insert to authenticated with check(owner_id=auth.uid() and community_active() and visibility='public' and object_key=auth.uid()::text||'/'||id::text and mime in ('image/jpeg','image/png','image/webp'));
create policy media_remove on media for delete to authenticated using(owner_id=auth.uid());
revoke update on notifications from authenticated;
grant update(read_at) on notifications to authenticated;
create policy notification_read_update on notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Chat creation/membership changes are available only through checked RPCs.
create unique index community_chat_unique on conversations(created_by,post_id);
create function public.community_start_chat(target uuid) returns uuid language plpgsql security definer set search_path=public as $$declare p posts; chat uuid; begin
 if not community_active() then raise exception 'Login required'; end if;
 select * into p from posts where id=target and status='published';
 if p.id is null or p.author_id=auth.uid() or community_blocked(p.author_id,auth.uid()) then raise exception 'Chat unavailable'; end if;
 insert into conversations(created_by,post_id) values(auth.uid(),target) on conflict(created_by,post_id) do update set post_id=excluded.post_id returning id into chat;
 insert into conversation_members(conversation_id,user_id) values(chat,auth.uid()),(chat,p.author_id) on conflict do nothing;
 return chat; end$$;
create function public.community_read_chat(target uuid) returns void language plpgsql security definer set search_path=public as $$begin
 if not community_active() or not in_conversation(target) then raise exception 'Not a participant'; end if;
 update conversation_members set last_read_at=now() where conversation_id=target and user_id=auth.uid(); end$$;
drop policy messages_send on messages;
create policy messages_send on messages for insert to authenticated with check(sender_id=auth.uid() and community_active() and in_conversation(conversation_id) and length(trim(body)) between 1 and 4000 and not exists(select 1 from conversation_members m where m.conversation_id=messages.conversation_id and community_blocked(m.user_id,auth.uid())));
create function public.community_notify() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_table_name='comments' then
 insert into notifications(user_id,message,target_id) select author_id,'새 댓글이 도착했어요.',new.post_id from posts where id=new.post_id and author_id<>new.author_id;
 else
 insert into notifications(user_id,message,target_id) select user_id,'새 메시지가 도착했어요.',new.conversation_id from conversation_members where conversation_id=new.conversation_id and user_id<>new.sender_id;
 end if; return new; end$$;
create trigger community_comment_notify after insert on comments for each row execute function community_notify();
create trigger community_message_notify after insert on messages for each row execute function community_notify();
create policy reports_admin_read on reports for select to authenticated using(community_admin());
drop policy report_create on reports;
create policy report_create on reports for insert to authenticated with check(reporter_id=auth.uid() and community_active() and status='pending' and length(trim(reason)) between 1 and 1000);
create table public.community_audit(id uuid primary key default gen_random_uuid(),actor_id uuid not null, target_id uuid not null,action text not null,created_at timestamptz not null default now());
alter table community_audit enable row level security;
revoke all on community_audit from anon,authenticated;
create function public.community_moderate(target uuid,kind text,state text) returns void language plpgsql security definer set search_path=public as $$begin
 if not community_admin() or not community_active() then raise exception 'Admin required'; end if;
 if kind='post' and state in ('published','hidden') then update posts set status=state where id=target;
 elsif kind='comment' and state in ('published','hidden') then update comments set status=state where id=target;
 elsif kind='report' and state='resolved' then update reports set status=state where id=target;
 elsif kind='account' and state in ('disabled','enabled') and target<>auth.uid() then update profiles set disabled=(state='disabled') where id=target;
 else raise exception 'Invalid moderation'; end if;
 insert into community_audit(actor_id,target_id,action) values(auth.uid(),target,kind||':'||state); end$$;
revoke all on function community_start_chat(uuid),community_read_chat(uuid),community_moderate(uuid,text,text) from public;
grant execute on function community_start_chat(uuid),community_read_chat(uuid),community_moderate(uuid,text,text) to authenticated;
-- This migration launches Phase 1 only, including direct PostgREST access.
-- A later-phase migration must deliberately grant its writes back.
revoke insert,update,delete on private_contacts,organizations,organization_members,provider_profiles,provider_verifications,quote_requests,quotes,quote_templates,selections,trade_confirmations,reviews,workplaces,rfqs,rfq_proposals,contracts,contract_reminders,tenders,bids,bid_versions,settlement_ledger from authenticated;
revoke execute on function submit_quote(uuid,bigint,text),submit_bid(uuid,bigint,text),withdraw_bid(uuid),open_tender(uuid),award_tender(uuid,uuid,text) from authenticated;

-- Supabase provisions this publication. Local PostgreSQL tests may not have it.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then alter publication supabase_realtime add table public.notifications; end if;
 end if;
end$$;

insert into categories(id,domain,name,sort) values
 ('청소·관리','consumer','청소·관리',1),
 ('공간·시공','consumer','공간·시공',4),
 ('제작·디지털','consumer','제작·디지털',6)
on conflict(id) do update set name=excluded.name,sort=excluded.sort,active=true;
update categories set sort=7 where id='기타';
update posts set category_id=case category_id when '청소' then '청소·관리' when '인테리어·시공' then '공간·시공' end where audience='consumer' and category_id in ('청소','인테리어·시공');
-- Keep old IDs for references in later-phase tables; hide them in new selections.
update categories set active=false where id in ('청소','인테리어·시공');
alter table posts add column service_mode text not null default 'local' check(service_mode in ('local','online'));
alter table posts add constraint post_service_region check((service_mode='online' and region='전국 · 온라인') or (service_mode='local' and region<>'전국 · 온라인'));

commit;
