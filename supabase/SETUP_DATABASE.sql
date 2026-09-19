-- MATDA initial schema: run once in a NEW project.
-- All changes are atomic; existing tables are not overwritten.
begin;


-- 0001_foundation.sql
-- Local-verifiable Supabase foundation. Apply only to a fresh staging project.
-- Monetary values are integer KRW; every business table has RLS.

create table public.profiles(id uuid primary key references auth.users(id),display_name text not null,region text not null default '',created_at timestamptz not null default now());
create table public.private_contacts(user_id uuid primary key references public.profiles(id),phone text,email text);
create table public.organizations(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),name text not null,verification text not null default 'unverified');
create table public.organization_members(org_id uuid references public.organizations(id),user_id uuid references public.profiles(id),role text not null check(role in ('owner','admin','member','procurement')),primary key(org_id,user_id));
create function public.is_org_member(org uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from organizations where id=org and owner_id=auth.uid()) or exists(select 1 from organization_members where org_id=org and user_id=auth.uid())$$;
create function public.is_procurement(org uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from organizations where id=org and owner_id=auth.uid()) or exists(select 1 from organization_members where org_id=org and user_id=auth.uid() and role in ('owner','admin','procurement'))$$;
create table public.categories(id text primary key,domain text not null check(domain in ('consumer','business')),name text not null,sort integer not null default 0,active boolean not null default true);
create table public.posts(id uuid primary key default gen_random_uuid(),author_id uuid not null references public.profiles(id),org_id uuid references public.organizations(id),post_type text not null check(post_type in ('request','question','review')),audience text not null check(audience in ('consumer','business')),category_id text references public.categories(id),title text not null,body text not null,region text not null,status text not null default 'published' check(status in ('published','hidden','deleted')),created_at timestamptz not null default now());
create table public.comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts(id),author_id uuid not null references public.profiles(id),body text not null,created_at timestamptz not null default now());
create table public.provider_profiles(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references public.profiles(id),name text not null,intro text not null,region text not null,categories text[] not null default '{}',portfolio jsonb not null default '[]',verification text not null default 'unverified' check(verification in ('unverified','pending','verified','rejected','expired')));
create table public.provider_verifications(id uuid primary key default gen_random_uuid(),provider_id uuid not null references public.provider_profiles(id),state text not null default 'pending',document_key text,checked_by uuid references public.profiles(id),checked_at timestamptz,expires_at timestamptz);
create table public.quote_requests(id uuid primary key default gen_random_uuid(),post_id uuid not null unique references public.posts(id),expires_at timestamptz not null default now()+interval '72 hours',quote_limit integer not null default 5 check(quote_limit between 1 and 10),extension_count integer not null default 0 check(extension_count between 0 and 2),state text not null default 'open');
create table public.quotes(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.quote_requests(id),provider_id uuid not null references public.profiles(id),amount bigint not null check(amount>=0),currency text not null default 'KRW',message text not null,available_date date,scope jsonb not null default '{}',created_at timestamptz not null default now(),unique(request_id,provider_id));
create table public.quote_templates(id uuid primary key default gen_random_uuid(),provider_id uuid not null references public.profiles(id),name text not null,fields jsonb not null);
create table public.selections(request_id uuid primary key references public.quote_requests(id),quote_id uuid not null references public.quotes(id),customer_selected_at timestamptz not null default now(),provider_accepted_at timestamptz,contact_unlocked_at timestamptz);
create table public.trade_confirmations(request_id uuid primary key references public.quote_requests(id),customer_response boolean,provider_response boolean,completed_at timestamptz);
create table public.reviews(id uuid primary key default gen_random_uuid(),request_id uuid not null references public.quote_requests(id),reviewer_id uuid not null references public.profiles(id),provider_id uuid not null references public.profiles(id),rating integer not null check(rating between 1 and 5),body text not null,unique(request_id,reviewer_id));
create table public.conversations(id uuid primary key default gen_random_uuid(),created_by uuid not null references public.profiles(id),post_id uuid references public.posts(id),created_at timestamptz not null default now());
create table public.conversation_members(conversation_id uuid references public.conversations(id),user_id uuid references public.profiles(id),last_read_at timestamptz,primary key(conversation_id,user_id));
create function public.in_conversation(chat uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from conversation_members where conversation_id=chat and user_id=auth.uid())$$;
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations(id),sender_id uuid not null references public.profiles(id),body text not null,created_at timestamptz not null default now());
create table public.workplaces(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),name text not null,region text not null,metadata jsonb not null default '{}');
create table public.rfqs(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),workplace_id uuid references public.workplaces(id),title text not null,scope text not null,category_id text references public.categories(id),region text not null,deadline timestamptz not null,status text not null default 'draft');
create table public.rfq_proposals(id uuid primary key default gen_random_uuid(),rfq_id uuid not null references public.rfqs(id),provider_id uuid not null references public.profiles(id),amount bigint not null check(amount>=0),currency text not null default 'KRW',proposal text not null,duration text not null,created_at timestamptz not null default now(),unique(rfq_id,provider_id));
create table public.contracts(id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),workplace_id uuid not null references public.workplaces(id),provider_name text not null,starts_at timestamptz not null,ends_at timestamptz not null,inspection_at timestamptz,status text not null default 'active',check(ends_at>starts_at));
create table public.contract_reminders(id uuid primary key default gen_random_uuid(),contract_id uuid not null references public.contracts(id),remind_at timestamptz not null,sent_at timestamptz);
create table public.tenders(id uuid primary key default gen_random_uuid(),buyer_org uuid not null references public.organizations(id),title text not null,scope text not null,eligibility text not null,evaluation_method text not null,starts_at timestamptz not null,deadline_at timestamptz not null,status text not null default 'draft' check(status in ('draft','published','opened','evaluating','awarded','cancelled','failed','no_award')),opened_at timestamptz,selected_bid uuid,check(deadline_at>starts_at));
create table public.bids(id uuid primary key default gen_random_uuid(),tender_id uuid not null references public.tenders(id),bidder_id uuid not null references public.profiles(id),status text not null default 'submitted' check(status in ('submitted','withdrawn')),unique(tender_id,bidder_id));
create table public.bid_versions(id uuid primary key default gen_random_uuid(),bid_id uuid not null references public.bids(id),version integer not null check(version>0),amount bigint not null check(amount>=0),currency text not null default 'KRW',proposal text not null,submitted_at timestamptz not null default now(),unique(bid_id,version));
create table public.tender_audit_logs(id uuid primary key default gen_random_uuid(),tender_id uuid not null references public.tenders(id),actor_id uuid not null references public.profiles(id),action text not null,created_at timestamptz not null default now(),metadata jsonb not null default '{}');
create table public.media(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),object_key text not null unique,visibility text not null check(visibility in ('public','private')),mime text not null,size bigint not null check(size>0 and size<=10485760),post_id uuid references public.posts(id),conversation_id uuid references public.conversations(id),proposal_id uuid references public.rfq_proposals(id),contract_id uuid references public.contracts(id),bid_version_id uuid references public.bid_versions(id),check(not(visibility='public' and (conversation_id is not null or proposal_id is not null or contract_id is not null or bid_version_id is not null))));
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references public.profiles(id),target_id uuid not null,reason text not null,status text not null default 'pending');
create table public.blocks(owner_id uuid references public.profiles(id),target_id uuid references public.profiles(id),primary key(owner_id,target_id),check(owner_id<>target_id));
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),message text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.analytics_events(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),event text not null,entity_id uuid,created_at timestamptz not null default now());
create table public.settlement_ledger(id uuid primary key default gen_random_uuid(),seller_id uuid not null references public.profiles(id),order_ref text not null unique,gross_amount bigint not null check(gross_amount>=0),refund_amount bigint not null default 0,payment_fee bigint not null default 0,platform_fee bigint not null default 0,withholding_tax bigint not null default 0,seller_net bigint not null,currency text not null default 'KRW',status text not null default 'shadow',provider_ref text,created_at timestamptz not null default now(),check(refund_amount>=0 and refund_amount<=gross_amount),check(seller_net=gross_amount-refund_amount-payment_fee-platform_fee-withholding_tax));
-- RLS is enabled even on tables without write policies (deny by default).
do $$declare t record;begin for t in select tablename from pg_tables where schemaname='public' loop execute format('alter table public.%I enable row level security',t.tablename);end loop;end$$;
create policy profile_read on profiles for select using(true);
create policy profile_insert on profiles for insert with check(id=auth.uid());
create policy profile_update on profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy contact_private on private_contacts for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy org_read on organizations for select using(is_org_member(id));
create policy org_create on organizations for insert with check(owner_id=auth.uid() and verification='unverified');
create policy members_read on organization_members for select using(is_org_member(org_id));
create policy categories_read on categories for select using(active);
create policy posts_read on posts for select using(status='published' or author_id=auth.uid());
create policy posts_create on posts for insert with check(author_id=auth.uid() and status='published' and (org_id is null or is_org_member(org_id)));
create policy posts_edit on posts for update using(author_id=auth.uid()) with check(author_id=auth.uid() and (org_id is null or is_org_member(org_id)));
create policy comments_read on comments for select using(exists(select 1 from posts where id=post_id and status='published'));
create policy comments_create on comments for insert with check(author_id=auth.uid() and exists(select 1 from posts where id=post_id and status='published'));
create policy comments_delete on comments for delete using(author_id=auth.uid());
create policy provider_read on provider_profiles for select using(true);
create policy provider_create on provider_profiles for insert with check(user_id=auth.uid() and verification='unverified');
-- Verification updates require a privileged admin worker; clients cannot self-certify.
create policy verification_read on provider_verifications for select using(exists(select 1 from provider_profiles p where p.id=provider_id and p.user_id=auth.uid()));
create policy requests_read on quote_requests for select using(exists(select 1 from posts where id=post_id));
create policy quotes_private on quotes for select using(provider_id=auth.uid() or exists(select 1 from quote_requests r join posts p on p.id=r.post_id where r.id=request_id and p.author_id=auth.uid()));
create policy template_owner on quote_templates for all using(provider_id=auth.uid()) with check(provider_id=auth.uid());
create policy selection_read on selections for select using(exists(select 1 from quotes q where q.id=quote_id));
create policy confirmation_read on trade_confirmations for select using(exists(select 1 from selections s where s.request_id=trade_confirmations.request_id));
create policy reviews_read on reviews for select using(true);
create policy chats_read on conversations for select using(in_conversation(id));
create policy chat_members_read on conversation_members for select using(in_conversation(conversation_id));
create policy messages_read on messages for select using(in_conversation(conversation_id));
create policy messages_send on messages for insert with check(sender_id=auth.uid() and in_conversation(conversation_id));
create policy workplace_member on workplaces for all using(is_org_member(org_id)) with check(is_org_member(org_id));
create policy rfq_read on rfqs for select using(status='published' or is_org_member(org_id));
create policy rfq_create on rfqs for insert with check(is_procurement(org_id) and deadline>now());
create policy proposal_read on rfq_proposals for select using(provider_id=auth.uid() or exists(select 1 from rfqs r where r.id=rfq_id and is_org_member(r.org_id)));
create policy proposal_create on rfq_proposals for insert with check(provider_id=auth.uid() and exists(select 1 from rfqs r where r.id=rfq_id and r.deadline>now() and r.status='published' and not is_org_member(r.org_id)));
create policy contract_member on contracts for all using(is_org_member(org_id)) with check(is_org_member(org_id) and exists(select 1 from workplaces w where w.id=workplace_id and w.org_id=contracts.org_id));
create policy reminders_read on contract_reminders for select using(exists(select 1 from contracts c where c.id=contract_id));
create policy tender_read on tenders for select using(status<>'draft' or is_org_member(buyer_org));
create policy tender_create on tenders for insert with check(is_procurement(buyer_org) and status='draft' and opened_at is null and selected_bid is null);
create policy bid_read on bids for select using(bidder_id=auth.uid() or exists(select 1 from tenders t where t.id=tender_id and t.opened_at is not null and t.deadline_at<=now() and is_procurement(t.buyer_org)));
create policy version_read on bid_versions for select using(exists(select 1 from bids b where b.id=bid_id));
create policy audit_read on tender_audit_logs for select using(exists(select 1 from tenders t where t.id=tender_id and is_org_member(t.buyer_org)));
create policy media_read on media for select using(visibility='public' or owner_id=auth.uid() or (conversation_id is not null and in_conversation(conversation_id)) or exists(select 1 from rfq_proposals p where p.id=proposal_id) or exists(select 1 from contracts c where c.id=contract_id) or exists(select 1 from bid_versions b where b.id=bid_version_id));
create policy report_owner on reports for select using(reporter_id=auth.uid());
create policy report_create on reports for insert with check(reporter_id=auth.uid() and status='pending');
create policy block_owner on blocks for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy notification_owner on notifications for select using(user_id=auth.uid());
create policy event_owner on analytics_events for select using(actor_id=auth.uid());
create policy ledger_owner on settlement_ledger for select using(seller_id=auth.uid());
-- Sensitive writes intentionally have no direct policies; use audited RPCs.
revoke all on all tables in schema public from anon;
grant select on profiles,categories,posts,comments,provider_profiles,quote_requests,reviews,rfqs,tenders,media to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
revoke all on settlement_ledger,tender_audit_logs,bid_versions,bids,selections,trade_confirmations,quotes,quote_requests,conversation_members,conversations from authenticated;
grant select on settlement_ledger,tender_audit_logs,bid_versions,bids,selections,trade_confirmations,quotes,quote_requests,conversation_members,conversations to authenticated;
create index posts_feed_idx on posts(audience,status,created_at desc);
create index messages_chat_idx on messages(conversation_id,created_at);
create index rfq_deadline_idx on rfqs(deadline);
create index tender_deadline_idx on tenders(deadline_at);
create index contract_expiry_idx on contracts(org_id,ends_at);


-- 0002_transactional_rpc.sql
-- Transactional RPC boundary; direct writes remain revoked.

create table public.platform_settings(key text primary key,value jsonb not null);
alter table public.platform_settings enable row level security;
insert into public.platform_settings values('quote_policy','{"default_limit":5,"max_limit":10,"default_hours":72,"extension_hours":24,"max_extensions":2,"max_hours":120,"active_limit":5,"category_active_limit":2}'::jsonb);
create policy settings_read on platform_settings for select using(true);
grant select on platform_settings to authenticated,anon;
create function public.submit_quote(request uuid,price bigint,description text) returns uuid language plpgsql security definer set search_path=public as $$
declare req quote_requests;post posts;quote_id uuid;begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 select * into req from quote_requests where id=request for update;
 if not found then raise exception 'request not found';end if;
 select * into post from posts where id=req.post_id;
 if req.state<>'open' or req.expires_at<=now() or post.status<>'published' then raise exception 'request closed';end if;
 if post.author_id=auth.uid() then raise exception 'self quote forbidden';end if;
 if not exists(select 1 from provider_profiles where user_id=auth.uid()) then raise exception 'provider required';end if;
 if price<0 or price>1000000000000 or length(trim(description))=0 then raise exception 'invalid quote';end if;
 select id into quote_id from quotes where request_id=request and provider_id=auth.uid();
 if quote_id is null and (select count(*) from quotes where request_id=request)>=req.quote_limit then raise exception 'quote limit reached';end if;
 insert into quotes(request_id,provider_id,amount,message) values(request,auth.uid(),price,description) on conflict(request_id,provider_id) do update set amount=excluded.amount,message=excluded.message returning id into quote_id;
 return quote_id;
end$$;
create function public.submit_bid(tender uuid,price bigint,proposal_text text) returns uuid language plpgsql security definer set search_path=public as $$
declare t tenders;bid uuid;next_version integer;begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 select * into t from tenders where id=tender for update;
 if not found or t.status<>'published' or now()<t.starts_at or now()>=t.deadline_at then raise exception 'tender closed';end if;
 if is_org_member(t.buyer_org) then raise exception 'buyer cannot bid';end if;
 if not exists(select 1 from provider_profiles where user_id=auth.uid()) then raise exception 'provider required';end if;
 if price<0 or price>1000000000000 or length(trim(proposal_text))=0 then raise exception 'invalid bid';end if;
 insert into bids(tender_id,bidder_id) values(tender,auth.uid()) on conflict(tender_id,bidder_id) do update set status='submitted' returning id into bid;
 select coalesce(max(version),0)+1 into next_version from bid_versions where bid_id=bid;
 insert into bid_versions(bid_id,version,amount,proposal) values(bid,next_version,price,proposal_text);
 insert into tender_audit_logs(tender_id,actor_id,action,metadata) values(tender,auth.uid(),'bid.submitted',jsonb_build_object('version',next_version));
 return bid;
end$$;
create function public.withdraw_bid(tender uuid) returns void language plpgsql security definer set search_path=public as $$
declare t tenders;begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 select * into t from tenders where id=tender for update;
 if not found or t.status<>'published' or now()>=t.deadline_at or now()<t.starts_at then raise exception 'tender closed';end if;
 update bids set status='withdrawn' where tender_id=tender and bidder_id=auth.uid();
 if not found then raise exception 'bid not found';end if;
 insert into tender_audit_logs(tender_id,actor_id,action) values(tender,auth.uid(),'bid.withdrawn');
end$$;
create function public.open_tender(tender uuid) returns void language plpgsql security definer set search_path=public as $$
declare t tenders;begin
 select * into t from tenders where id=tender for update;
 if not found or not is_procurement(t.buyer_org) then raise exception 'procurement permission required';end if;
 if t.status<>'published' or now()<t.deadline_at then raise exception 'deadline not reached or already opened';end if;
 update tenders set status='opened',opened_at=now() where id=tender;
 insert into tender_audit_logs(tender_id,actor_id,action) values(tender,auth.uid(),'tender.opened');
end$$;
create function public.award_tender(tender uuid,bid uuid,note text) returns void language plpgsql security definer set search_path=public as $$
declare t tenders;begin
 select * into t from tenders where id=tender for update;
 if not found or not is_procurement(t.buyer_org) then raise exception 'procurement permission required';end if;
 if t.status not in ('opened','evaluating') or t.opened_at is null then raise exception 'tender not opened';end if;
 if length(trim(note))=0 then raise exception 'evaluation note required';end if;
 if not exists(select 1 from bids where id=bid and tender_id=tender and status='submitted') then raise exception 'invalid bid';end if;
 update tenders set status='awarded',selected_bid=bid where id=tender;
 insert into tender_audit_logs(tender_id,actor_id,action,metadata) values(tender,auth.uid(),'tender.awarded',jsonb_build_object('bid',bid,'note',note));
end$$;
revoke all on function submit_quote(uuid,bigint,text),submit_bid(uuid,bigint,text),withdraw_bid(uuid),open_tender(uuid),award_tender(uuid,uuid,text) from public,anon;
grant execute on function submit_quote(uuid,bigint,text),submit_bid(uuid,bigint,text),withdraw_bid(uuid),open_tender(uuid),award_tender(uuid,uuid,text) to authenticated;


-- 0003_free_post_type.sql

alter table public.posts drop constraint if exists posts_post_type_check;
alter table public.posts add constraint posts_post_type_check check (post_type in ('request','question','review','free'));


commit;
