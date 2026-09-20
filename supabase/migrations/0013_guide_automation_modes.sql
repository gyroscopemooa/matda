begin;
create table if not exists guide_automation_settings (
  id boolean primary key default true check(id),
  mode text not null default 'manual' check(mode in ('manual','draft','auto')),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);
insert into guide_automation_settings(id) values(true) on conflict do nothing;
alter table guide_automation_settings enable row level security;
grant select,update on guide_automation_settings to authenticated;
grant select on guide_automation_settings to service_role;
drop policy if exists guide_settings_admin on guide_automation_settings;
create policy guide_settings_admin on guide_automation_settings to authenticated using(community_admin() and community_active()) with check(community_admin() and community_active());
alter table guide_articles add column if not exists publication_mode text not null default 'manual' check(publication_mode in ('manual','auto'));
-- Replace the original anonymous check with explicit human/automatic provenance.
alter table guide_articles drop constraint if exists guide_articles_check;
alter table guide_articles drop constraint if exists guide_publication_provenance;
alter table guide_articles add constraint guide_publication_provenance check (
  status <> 'published' or (published_at is not null and (
    (publication_mode='manual' and reviewed and reviewed_by is not null) or
    (publication_mode='auto' and not reviewed and reviewed_by is null)
  ))
);
create or replace function finish_guide_day_v2(p_day date,p_token uuid,p_content jsonb,p_scheduled boolean,p_eligible boolean) returns text
language plpgsql security definer set search_path=public as $$
declare publish_now boolean; selected_mode text;
begin
  perform 1 from guide_generation_runs where day=p_day and token=p_token and status='running' for update;
  if not found then return null; end if;
  select mode into selected_mode from guide_automation_settings where id=true for share;
  publish_now := p_scheduled and p_eligible and selected_mode='auto';
  insert into guide_articles(slug,generation_day,content,status,publication_mode,published_at)
  values('daily-'||p_day::text,p_day,p_content,case when publish_now then 'published' else 'draft' end,case when publish_now then 'auto' else 'manual' end,case when publish_now then now() else null end);
  update guide_generation_runs set status='complete',error=null where day=p_day and token=p_token;
  return case when publish_now then 'published' else 'draft' end;
end $$;
revoke all on function finish_guide_day_v2(date,uuid,jsonb,boolean,boolean) from public,anon,authenticated;
grant execute on function finish_guide_day_v2(date,uuid,jsonb,boolean,boolean) to service_role;
commit;
