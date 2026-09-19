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
commit;
