-- Add proposal types and private shared request Q&A. Does not enable release.
begin;
alter table quotes alter column amount drop not null;
alter table quotes add column proposal_type text not null default 'fixed' check(proposal_type in ('fixed','estimate','inspection'));
alter table quotes add column amount_max bigint;
alter table quotes add constraint proposal_price_shape check (
 (proposal_type='inspection' and amount is null and amount_max is null) or
 (proposal_type='fixed' and amount is not null and amount>=0 and amount_max is null) or
 (proposal_type='estimate' and amount is not null and amount>=0 and amount_max is not null and amount_max>=amount)
);
create or replace function consumer_quote_action(operation text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); p posts; r quote_requests; q quotes; s selections; result_id uuid; price bigint;
 details jsonb; accepted boolean; counterparty uuid; chat uuid; respond boolean; proposal text; max_price bigint;
begin
 if actor is null or not community_active() then raise exception 'Active account required'; end if;
 if not consumer_quote_live() then raise exception 'Consumer quotes are not released'; end if;
 perform 1 from profiles where id=actor for update;
 if operation='profile.enableProvider' then
  insert into provider_profiles(user_id,name,intro,region) select id,display_name,'',region from profiles where id=actor on conflict(user_id) do nothing;
  return jsonb_build_object('ok',true);
 elsif operation='provider.save' then
  if not exists(select 1 from provider_profiles where user_id=actor) then raise exception 'Provider required'; end if;
  if not exists(select 1 from categories where id=payload->>'category' and active) then raise exception 'Invalid category'; end if;
  update provider_profiles set name=consumer_quote_text(payload,'name',80,true),intro=consumer_quote_text(payload,'intro',2000,true),region=consumer_quote_text(payload,'region',80,true),categories=array[payload->>'category'],portfolio=jsonb_build_array(consumer_quote_text(payload,'portfolio',5000)) where user_id=actor returning id into result_id;
  insert into private_contacts(user_id,phone) values(actor,consumer_quote_text(payload,'contact',120,true)) on conflict(user_id) do update set phone=excluded.phone;
  return jsonb_build_object('id',result_id);
 elsif operation='template.save' then
  if not exists(select 1 from provider_profiles where user_id=actor) then raise exception 'Provider required'; end if;
  price:=(payload->>'amount')::bigint;
  if price is null or price<0 or price>1000000000000 then raise exception 'Invalid amount'; end if;
  details:=jsonb_build_object('amount',price,'message',consumer_quote_text(payload,'message',1000,true),'scope',consumer_quote_text(payload,'scope',2000),'duration',consumer_quote_text(payload,'duration',200),'extraCost',consumer_quote_text(payload,'extraCost',2000));
  insert into quote_templates(provider_id,name,fields) values(actor,consumer_quote_text(payload,'name',80,true),details) returning id into result_id;
  return jsonb_build_object('id',result_id);
 elsif operation='post.create' then
  if payload->>'type'<>'request' or coalesce(payload->>'audience','consumer')<>'consumer' then raise exception 'Consumer request required'; end if;
  if not exists(select 1 from categories where id=payload->>'category' and active) then raise exception 'Invalid category'; end if;
  if exists(select 1 from posts where author_id=actor and body=payload->>'body' and created_at>now()-interval '24 hours') then raise exception 'Duplicate request'; end if;
  insert into posts(id,author_id,post_type,audience,category_id,title,body,region,service_mode,images,budget,schedule,community_sector,community_purpose)
  values((payload->>'id')::uuid,actor,'request','consumer',payload->>'category',consumer_quote_text(payload,'title',120),consumer_quote_text(payload,'body',5000,true),consumer_quote_text(payload,'region',80,true),coalesce(payload->>'serviceMode','local'),array(select jsonb_array_elements_text(coalesce(payload->'images','[]'))::uuid),nullif(payload->>'budget','')::bigint,coalesce(payload->'schedule','{}'),coalesce(payload->>'communitySector','personal'),'general') returning id into result_id;
  perform consumer_quote_request(result_id,'enable',true);
  return jsonb_build_object('id',result_id);
 end if;

 if operation in ('quote.select','quote.chat') then
  select * into q from quotes where id=(payload->>'id')::uuid;
  if not found then raise exception 'Quote not found'; end if;
  select post_id into result_id from quote_requests where id=q.request_id;
 else result_id:=coalesce(payload->>'postId',payload->>'id')::uuid; end if;
 -- All request mutations lock the parent before the request, matching conversion.
 select * into p from posts where id=result_id for update;
 if not found or p.status<>'published' or p.is_sample then raise exception 'Published request required'; end if;
 select * into r from quote_requests where post_id=p.id for update;
 if not found then
  if operation='quote.viewed' then return jsonb_build_object('ok',true); end if;
  raise exception 'Quote request required';
 end if;
 if operation in ('quote.select','quote.chat') then select * into q from quotes where id=(payload->>'id')::uuid; end if;
 select * into s from selections where request_id=r.id;
 if operation='quote.submit' then
  if p.author_id=actor then raise exception 'Self quote forbidden'; end if;
  if not exists(select 1 from provider_profiles where user_id=actor) then raise exception 'Provider required'; end if;
  if community_blocked(actor,p.author_id) or not exists(select 1 from profiles where id=p.author_id and not disabled) then raise exception 'Counterparty unavailable'; end if;
  if r.state<>'open' or s.request_id is not null or (r.expires_at<=now() and not exists(select 1 from quotes where request_id=r.id and provider_id=actor)) then raise exception 'Request closed'; end if;
  proposal:=coalesce(payload->>'proposalType','fixed');
  if proposal not in ('fixed','estimate','inspection') then raise exception 'Invalid proposal type'; end if;
  price:=case when proposal='inspection' then null else nullif(payload->>'amount','')::bigint end;
  max_price:=case when proposal='estimate' then nullif(payload->>'amountMax','')::bigint else null end;
  if proposal<>'inspection' and (price is null or price<0 or price>1000000000000) then raise exception 'Invalid amount'; end if;
  if proposal='estimate' and (max_price is null or max_price<price or max_price>1000000000000) then raise exception 'Invalid amount range'; end if;
  if proposal='estimate' then perform consumer_quote_text(payload,'priceCondition',1000,true); end if;
  if proposal='inspection' then
   perform consumer_quote_text(payload,'inspectionReason',1000,true);
   perform consumer_quote_text(payload,'visitSlots',500,true);
   if nullif(payload->>'visitFee','')::bigint is null or (payload->>'visitFee')::bigint<0 or (payload->>'visitFee')::bigint>1000000000000 then raise exception 'Invalid visit fee'; end if;
  end if;
  select * into q from quotes where request_id=r.id and provider_id=actor;
  if q.id is null and (select count(*) from quotes where request_id=r.id)>=r.quote_limit then raise exception 'Quote limit reached'; end if;
  details:=jsonb_build_object('scope',consumer_quote_text(payload,'scope',2000),'duration',consumer_quote_text(payload,'duration',200),'extraCost',consumer_quote_text(payload,'extraCost',2000));
  details:=details || jsonb_build_object('priceCondition',case when proposal='estimate' then payload->>'priceCondition' else '' end,'inspectionReason',case when proposal='inspection' then payload->>'inspectionReason' else '' end,'visitSlots',case when proposal='inspection' then payload->>'visitSlots' else '' end,'visitFee',case when proposal='inspection' then (payload->>'visitFee')::bigint else null end);
  insert into quotes(request_id,provider_id,amount,proposal_type,amount_max,message,available_date,scope) values(r.id,actor,price,proposal,max_price,consumer_quote_text(payload,'message',1000,true),nullif(payload->>'availableDate','')::date,details)
  on conflict(request_id,provider_id) do update set amount=excluded.amount,proposal_type=excluded.proposal_type,amount_max=excluded.amount_max,message=excluded.message,available_date=excluded.available_date,scope=excluded.scope,viewed_at=null returning id into result_id;
  insert into notifications(user_id,message,target_id,source_id) values(p.author_id,'새 견적이 도착했어요.',p.id,result_id);
  return jsonb_build_object('id',result_id);
 elsif operation='quote.viewed' then
  if actor=p.author_id then update quotes set viewed_at=coalesce(viewed_at,now()) where request_id=r.id; end if;
 elsif operation='quote.select' then
  if q.proposal_type<>'fixed' then raise exception 'Final fixed quote required'; end if;
  if actor<>p.author_id then raise exception 'Request owner required'; end if;
  if s.request_id is not null then
   if s.quote_id=q.id then return jsonb_build_object('id',p.id); end if;
   raise exception 'Provider already selected';
  end if;
  if community_blocked(actor,q.provider_id) or not exists(select 1 from profiles where id=q.provider_id and not disabled) then raise exception 'Counterparty unavailable'; end if;
  accepted:=not exists(select 1 from platform_settings where key='quote_require_acceptance' and value='true'::jsonb);
  insert into selections(request_id,quote_id,contact_unlocked_at) values(r.id,q.id,case when accepted then now() end);
  update quote_requests set state='selected' where id=r.id;
  insert into notifications(user_id,message,target_id) values(q.provider_id,'고객님이 업체를 선택했어요.',p.id);
 elsif operation='quote.chat' then
  if actor not in (p.author_id,q.provider_id) then raise exception 'Quote participant required'; end if;
  counterparty:=case when actor=p.author_id then q.provider_id else p.author_id end;
  if community_blocked(actor,counterparty) or not exists(select 1 from profiles where id=counterparty and not disabled) then raise exception 'Counterparty unavailable'; end if;
  -- Reuse the provider -> post-owner chat, whichever party starts it.
  insert into conversations(created_by,post_id) values(q.provider_id,p.id) on conflict(created_by,post_id) do update set post_id=excluded.post_id returning id into chat;
  if exists(select 1 from conversations where id=chat and closed_at is not null) then raise exception 'Conversation closed'; end if;
  insert into conversation_members(conversation_id,user_id) values(chat,p.author_id),(chat,q.provider_id) on conflict do nothing;
  update conversation_members set left_at=null where conversation_id=chat and user_id=actor;
  return jsonb_build_object('id',chat);
 elsif operation in ('selection.accept','trade.confirm','review.create') then
  select * into q from quotes where id=s.quote_id;
  if q.id is null or actor not in (p.author_id,q.provider_id) then raise exception 'Selected participant required'; end if;
  if operation='selection.accept' then
   if actor<>q.provider_id then raise exception 'Selected provider required'; end if;
   update selections set provider_accepted_at=coalesce(provider_accepted_at,now()),contact_unlocked_at=coalesce(contact_unlocked_at,now()) where request_id=r.id;
  elsif operation='trade.confirm' then
   if jsonb_typeof(payload->'confirmed') is distinct from 'boolean' then raise exception 'Boolean confirmation required'; end if;
   respond:=(payload->>'confirmed')::boolean;
   insert into trade_confirmations(request_id) values(r.id) on conflict do nothing;
   if actor=p.author_id then update trade_confirmations set customer_response=respond where request_id=r.id;
   else
    update trade_confirmations set provider_response=respond where request_id=r.id;
    if respond then update selections set provider_accepted_at=coalesce(provider_accepted_at,now()),contact_unlocked_at=coalesce(contact_unlocked_at,now()) where request_id=r.id; end if;
   end if;
   update trade_confirmations set completed_at=case when customer_response and provider_response then coalesce(completed_at,now()) else null end where request_id=r.id;
  else
   if actor<>p.author_id or not exists(select 1 from trade_confirmations where request_id=r.id and customer_response) then raise exception 'Customer trade confirmation required'; end if;
   insert into reviews(request_id,reviewer_id,provider_id,rating,body) values(r.id,actor,q.provider_id,(payload->>'rating')::integer,consumer_quote_text(payload,'body',5000,true)) returning id into result_id;
   return jsonb_build_object('id',result_id);
  end if;
 else raise exception 'Unsupported quote operation'; end if;
 return jsonb_build_object('id',p.id);
end$$;
create table quote_questions (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references quote_requests(id) on delete cascade,
 provider_id uuid not null references profiles(id),
 question text not null check(length(question) between 1 and 200),
 question_key text not null,
 answer text not null default '' check(length(answer)<=2000),
 answered_at timestamptz,
 created_at timestamptz not null default now(),
 unique(request_id,question_key)
);
create function consumer_question_visible(target uuid) returns boolean language sql stable security definer set search_path=public as $$
 select consumer_quote_live() and community_active() and exists(
  select 1 from quote_requests r join posts p on p.id=r.post_id where r.id=target
  and not community_blocked(auth.uid(),p.author_id)
  and (p.author_id=auth.uid() or exists(select 1 from quotes q where q.request_id=r.id and q.provider_id=auth.uid()))
 )
$$;
alter table quote_questions enable row level security;
grant select on quote_questions to authenticated;
revoke all on quote_questions from anon;
create policy quote_question_participants on quote_questions for select to authenticated using(consumer_question_visible(request_id));
create function consumer_quote_question_action(operation text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); p posts; r quote_requests; question_row quote_questions; target uuid; text_value text; normalized text;
begin
 if actor is null or not community_active() or not consumer_quote_live() then raise exception 'Active released account required'; end if;
 perform 1 from profiles where id=actor for update;
 if operation='quote.answer' then
  select * into question_row from quote_questions where id=(payload->>'id')::uuid;
  select post_id into target from quote_requests where id=question_row.request_id;
 elsif operation='quote.question' then target:=(payload->>'postId')::uuid;
 else raise exception 'Unknown question operation'; end if;
 select * into p from posts where id=target for update;
 select * into r from quote_requests where post_id=p.id for update;
 if r.id is null or p.status<>'published' or r.state<>'open' or exists(select 1 from selections where request_id=r.id) then raise exception 'Request closed'; end if;
 if not consumer_question_visible(r.id) then raise exception 'Quote participant required'; end if;
 if operation='quote.question' then
  if p.author_id=actor or not exists(select 1 from provider_profiles where user_id=actor) or not exists(select 1 from quotes where request_id=r.id and provider_id=actor) then raise exception 'Participating provider required'; end if;
  text_value:=consumer_quote_text(payload,'question',200,true);
  normalized:=lower(regexp_replace(text_value,'\s','','g'));
  select * into question_row from quote_questions where request_id=r.id and question_key=normalized;
  if found then return jsonb_build_object('id',question_row.id); end if;
  if (select count(*) from quote_questions where request_id=r.id)>=20 then raise exception 'Question limit reached'; end if;
  insert into quote_questions(request_id,provider_id,question,question_key) values(r.id,actor,text_value,normalized) returning * into question_row;
  insert into notifications(user_id,message,target_id) values(p.author_id,'업체가 추가정보를 요청했어요.',p.id);
 else
  if actor<>p.author_id then raise exception 'Request owner required'; end if;
  if coalesce(payload->>'shareConsent','') not in ('true','공유 동의') then raise exception 'Sharing consent required'; end if;
  text_value:=consumer_quote_text(payload,'answer',2000,true);
  update quote_questions set answer=text_value,answered_at=now() where id=question_row.id;
  insert into notifications(user_id,message,target_id) select q.provider_id,'요청에 공통 답변이 추가됐어요.',p.id from quotes q join profiles pr on pr.id=q.provider_id where q.request_id=r.id and not pr.disabled and not community_blocked(actor,q.provider_id);
 end if;
 return jsonb_build_object('id',question_row.id);
end$$;
revoke all on function consumer_quote_question_action(text,jsonb) from public,anon;
grant execute on function consumer_quote_question_action(text,jsonb) to authenticated;
revoke all on function consumer_question_visible(uuid) from public,anon;
grant execute on function consumer_question_visible(uuid) to authenticated;
commit;
