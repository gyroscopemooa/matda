-- Phase 2A: request conversion only. Keep release disabled until the entire
-- remote quote/trade flow is ready; this migration does not open submissions.
begin;
insert into public.platform_settings(key,value) values ('consumer_quotes_enabled','false'::jsonb) on conflict(key) do nothing;
alter table public.quote_requests add column if not exists started_at timestamptz;
update public.quote_requests set started_at=expires_at-interval '72 hours'-extension_count*interval '24 hours' where started_at is null;
alter table public.quote_requests alter column started_at set default now();
alter table public.quote_requests alter column started_at set not null;

create or replace function public.consumer_quote_request(target uuid, operation text, consent boolean default false)
returns uuid language plpgsql security definer set search_path=public as $$
declare p posts; r quote_requests; next_expiry timestamptz;
begin
 if auth.uid() is null or not community_active() then raise exception 'Active account required'; end if;
 if not exists(select 1 from platform_settings where key='consumer_quotes_enabled' and value='true'::jsonb) then raise exception 'Consumer quotes are not released'; end if;
 -- Serialize all of this customer's conversions, including different posts.
 perform 1 from profiles where id=auth.uid() for update;
 select * into p from posts where id=target for update;
 if not found or p.author_id is distinct from auth.uid() then raise exception 'Request owner required'; end if;
 if p.status<>'published' or p.post_type<>'request' or p.audience<>'consumer' or p.is_sample or p.category_id is null then raise exception 'Published consumer request required'; end if;
 select * into r from quote_requests where post_id=target for update;
 if operation='enable' then
  if consent is distinct from true then raise exception 'Explicit consent required'; end if;
  if r.id is not null then return r.id; end if;
  if (select count(*) from quote_requests q join posts x on x.id=q.post_id where x.author_id=auth.uid() and x.status='published' and q.state='open' and q.expires_at>now())>=5
    or (select count(*) from quote_requests q join posts x on x.id=q.post_id where x.author_id=auth.uid() and x.status='published' and x.category_id=p.category_id and q.state='open' and q.expires_at>now())>=2 then raise exception 'Active request limit reached'; end if;
  insert into quote_requests(post_id,started_at,expires_at,quote_limit,extension_count) values(target,now(),now()+interval '72 hours',5,0) returning id into r.id;
  return r.id;
 end if;
 if r.id is null or r.state<>'open' or exists(select 1 from selections where request_id=r.id) then raise exception 'Open request required'; end if;
 if operation='expand' then
  if r.expires_at<=now() then raise exception 'Request expired'; end if;
  update quote_requests set quote_limit=10 where id=r.id;
 elsif operation='extend' then
  next_expiry:=least(r.expires_at+interval '24 hours',r.started_at+interval '120 hours');
  if r.extension_count>=2 or next_expiry<=now() then raise exception 'Extension limit reached'; end if;
  update quote_requests set expires_at=next_expiry,extension_count=extension_count+1 where id=r.id;
 else raise exception 'Unknown request operation';
 end if;
 return r.id;
end $$;

-- Only aggregate counts are public. Other providers' amounts/messages stay RLS protected.
create or replace function public.consumer_quote_summary()
returns table(post_id uuid,request_id uuid,started_at timestamptz,expires_at timestamptz,quote_limit integer,extension_count integer,state text,quote_count bigint)
language sql stable security definer set search_path=public as $$
 select p.id,r.id,r.started_at,r.expires_at,r.quote_limit,r.extension_count,r.state,(select count(*) from quotes q where q.request_id=r.id)
 from quote_requests r join posts p on p.id=r.post_id
 where (p.status='published' or p.author_id=auth.uid()) and p.audience='consumer'
 and exists(select 1 from platform_settings where key='consumer_quotes_enabled' and value='true'::jsonb)
$$;

-- A post edit must not silently turn an existing request into a different kind.
create or replace function public.consumer_quote_post_guard() returns trigger
language plpgsql security definer set search_path=public as $$begin
 if exists(select 1 from quote_requests where post_id=old.id) and
 (new.post_type is distinct from old.post_type or new.audience is distinct from old.audience or new.author_id is distinct from old.author_id or new.category_id is distinct from old.category_id or new.is_sample is distinct from old.is_sample) then
  raise exception 'Quote request classification is locked';
 end if;
 return new;
end $$;
drop trigger if exists consumer_quote_post_guard on public.posts;
create trigger consumer_quote_post_guard before update on public.posts for each row execute function public.consumer_quote_post_guard();
revoke all on function public.consumer_quote_request(uuid,text,boolean),public.consumer_quote_summary(),public.consumer_quote_post_guard() from public,anon,authenticated;
grant execute on function public.consumer_quote_request(uuid,text,boolean) to authenticated;
grant execute on function public.consumer_quote_summary() to anon,authenticated;
commit;
