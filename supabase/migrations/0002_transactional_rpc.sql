-- Transactional RPC boundary; direct writes remain revoked.
begin;
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
commit;
