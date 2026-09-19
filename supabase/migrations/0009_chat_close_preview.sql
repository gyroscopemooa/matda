begin;
alter table public.conversation_members add column if not exists left_at timestamptz;
create or replace function public.community_leave_chat(target uuid) returns void language plpgsql security definer set search_path=public as $$begin
 if not community_active() or not in_conversation(target) then raise exception 'Not a participant'; end if;
 update conversation_members set left_at=clock_timestamp(),last_read_at=clock_timestamp() where conversation_id=target and user_id=auth.uid();
 update notifications set read_at=now() where user_id=auth.uid() and target_id=target;
end$$;
create or replace function public.community_read_chat(target uuid) returns void language plpgsql security definer set search_path=public as $$begin
 if not community_active() or not in_conversation(target) then raise exception 'Not a participant'; end if;
 update conversation_members set last_read_at=now(),left_at=null where conversation_id=target and user_id=auth.uid();
end$$;
revoke all on function public.community_leave_chat(uuid) from public;
grant execute on function public.community_leave_chat(uuid) to authenticated;


alter table public.conversations add column if not exists closed_at timestamptz;
alter table public.conversations add column if not exists closed_by uuid references auth.users(id);
alter table public.notifications add column if not exists source_id uuid;
create or replace function public.community_close_chat(target uuid) returns void language plpgsql security definer set search_path=public as $$begin
 if not community_active() or not in_conversation(target) then raise exception 'Not a participant'; end if;
 perform 1 from conversations where id=target for update;
 if exists(select 1 from conversations where id=target and closed_at is not null) then return; end if;
 update conversations set closed_at=clock_timestamp(),closed_by=auth.uid() where id=target;
 update conversation_members set left_at=null where conversation_id=target;
 insert into notifications(user_id,message,target_id) select user_id,'상대방이 대화를 종료했어요.',target from conversation_members where conversation_id=target and user_id<>auth.uid();
end$$;
revoke all on function public.community_close_chat(uuid) from public;
grant execute on function public.community_close_chat(uuid) to authenticated;
create or replace function public.community_check_chat_open() returns trigger language plpgsql security definer set search_path=public as $$begin
 perform 1 from conversations where id=new.conversation_id for update;
 if exists(select 1 from conversations where id=new.conversation_id and closed_at is not null) then raise exception 'Conversation closed'; end if;
 return new;
end$$;
revoke all on function public.community_check_chat_open() from public;
drop trigger if exists community_message_open on public.messages;
create trigger community_message_open before insert on public.messages for each row execute function public.community_check_chat_open();
create or replace function public.community_notify() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_table_name='comments' then
 insert into notifications(user_id,message,target_id,source_id) select author_id,'새 댓글이 도착했어요.',new.post_id,new.id from posts where id=new.post_id and author_id<>new.author_id;
 else
 insert into notifications(user_id,message,target_id,source_id) select user_id,'새 메시지가 도착했어요.',new.conversation_id,new.id from conversation_members where conversation_id=new.conversation_id and user_id<>new.sender_id;
 end if; return new;
end$$;
commit;
