begin;
insert into categories(id,domain,name,sort) values
('산업안전·보건','business','산업안전·보건',20),
('전기·에너지','business','전기·에너지',21),
('소방·방재','business','소방·방재',22),
('시설·건물관리','business','시설·건물관리',23),
('환경·폐기물','business','환경·폐기물',24),
('검사·인증·품질','business','검사·인증·품질',25),
('IT·기업운영','business','IT·기업운영',26),
('경영지원·전문대행','business','경영지원·전문대행',27)
on conflict(id) do update set active=true;
-- Community business topics do not enable RFQ/organization privileges.
alter table posts add column if not exists community_sector text not null default 'personal' check (community_sector in ('personal','business'));
alter table posts add column if not exists community_purpose text not null default 'general' check (community_purpose in ('general','introduction'));
alter table posts drop constraint if exists posts_introduction_sector;
alter table posts add constraint posts_introduction_sector check (community_purpose <> 'introduction' or (community_sector='business' and post_type='free'));
create table if not exists guide_articles (
  slug text primary key,
  generation_day date unique not null,
  content jsonb not null,
  status text not null default 'draft' check (status in ('draft','published','held')),
  reviewed boolean not null default false,
  reviewed_by uuid references profiles(id),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'published' or (reviewed and reviewed_by is not null and published_at is not null))
);
create table if not exists guide_generation_runs (
  day date primary key,
  status text not null check(status in ('running','complete','failed')),
  attempts integer not null default 1,
  token uuid not null,
  started_at timestamptz not null default now(),
  error text
);
alter table guide_articles enable row level security;
alter table guide_generation_runs enable row level security;
grant select on guide_articles to anon, authenticated;
grant update on guide_articles to authenticated;
grant select on guide_generation_runs to authenticated;
grant all on guide_articles,guide_generation_runs to service_role;
drop policy if exists guide_read on guide_articles;
create policy guide_read on guide_articles for select using(status='published');
drop policy if exists guide_admin_read on guide_articles;
create policy guide_admin_read on guide_articles for select to authenticated using(community_admin());
drop policy if exists guide_edit on guide_articles;
create policy guide_edit on guide_articles for update to authenticated using(community_admin() and community_active()) with check(community_admin() and community_active());
drop policy if exists guide_runs_admin on guide_generation_runs;
create policy guide_runs_admin on guide_generation_runs for select to authenticated using(community_admin());
create or replace function claim_guide_day(p_day date,p_token uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare n integer;
begin
  if exists(select 1 from guide_articles where generation_day=p_day) then return false; end if;
  insert into guide_generation_runs(day,status,token) values(p_day,'running',p_token)
  on conflict(day) do update set status='running',token=p_token,started_at=now(),attempts=guide_generation_runs.attempts+1,error=null
  where guide_generation_runs.attempts < 3 and (guide_generation_runs.status='failed' or (guide_generation_runs.status='running' and guide_generation_runs.started_at < now()-interval '10 minutes'));
  get diagnostics n=row_count;
  return n=1;
end $$;
revoke all on function claim_guide_day(date,uuid) from public,anon,authenticated;
grant execute on function claim_guide_day(date,uuid) to service_role;
create or replace function finish_guide_day(p_day date,p_token uuid,p_content jsonb) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  perform 1 from guide_generation_runs where day=p_day and token=p_token and status='running' for update;
  if not found then return false; end if;
  insert into guide_articles(slug,generation_day,content) values('daily-'||p_day::text,p_day,p_content);
  update guide_generation_runs set status='complete',error=null where day=p_day and token=p_token;
  return true;
end $$;
revoke all on function finish_guide_day(date,uuid,jsonb) from public,anon,authenticated;
grant execute on function finish_guide_day(date,uuid,jsonb) to service_role;
commit;
