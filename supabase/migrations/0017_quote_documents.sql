begin;
alter table media add column if not exists quote_id uuid references quotes(id);
alter table media add column if not exists file_name text;
alter table media add constraint quote_document_private check(quote_id is null or (visibility='private' and post_id is null and conversation_id is null and proposal_id is null and contract_id is null and bid_version_id is null));
create or replace function consumer_quote_document_allowed(target uuid, writing boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select consumer_quote_live() and community_active() and exists(
 select 1 from quotes q join quote_requests r on r.id=q.request_id join posts p on p.id=r.post_id
 where q.id=target and p.status='published' and not community_blocked(p.author_id,q.provider_id)
 and ((not writing and auth.uid() in (q.provider_id,p.author_id)) or (writing and auth.uid()=q.provider_id and r.state='open' and r.expires_at>now() and not exists(select 1 from selections where request_id=r.id))))
$$;
revoke all on function consumer_quote_document_allowed(uuid,boolean) from public,anon;
grant execute on function consumer_quote_document_allowed(uuid,boolean) to authenticated;
create policy quote_document_read on media for select to authenticated using(quote_id is not null and consumer_quote_document_allowed(quote_id,false));
create policy quote_document_create on media for insert to authenticated with check(owner_id=auth.uid() and quote_id is not null and visibility='private' and storage_provider='supabase' and object_key=auth.uid()::text||'/'||quote_id::text||'/'||id::text and consumer_quote_document_allowed(quote_id,true) and length(file_name) between 1 and 180);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('quote-documents','quote-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp','application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy quote_storage_insert on storage.objects for insert to authenticated with check(bucket_id='quote-documents' and (storage.foldername(name))[1]=auth.uid()::text and public.consumer_quote_document_allowed(((storage.foldername(name))[2])::uuid,true));
create policy quote_storage_read on storage.objects for select to authenticated using(bucket_id='quote-documents' and exists(select 1 from public.media m where m.object_key=name and m.quote_id is not null and public.consumer_quote_document_allowed(m.quote_id,false)));
create policy quote_storage_cleanup on storage.objects for delete to authenticated using(bucket_id='quote-documents' and owner_id=auth.uid()::text and (storage.foldername(name))[1]=auth.uid()::text);
commit;
