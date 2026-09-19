-- Apply after 0004-0006. Existing media remains tagged as R2.
begin;
alter table public.media add column storage_provider text not null default 'r2' check(storage_provider in ('r2','supabase'));
alter table public.media alter column storage_provider set default 'supabase';
update storage.buckets set public=true, file_size_limit=2097152, allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='community-images';
do $$ begin if not exists(select 1 from storage.buckets where id='community-images') then raise exception 'Create community-images bucket first'; end if; end $$;
create policy community_images_insert on storage.objects for insert to authenticated with check(bucket_id='community-images' and (storage.foldername(name))[1]=auth.uid()::text and public.community_active());
create policy community_images_select_own on storage.objects for select to authenticated using(bucket_id='community-images' and owner_id=auth.uid()::text);
create policy community_images_delete_own on storage.objects for delete to authenticated using(bucket_id='community-images' and owner_id=auth.uid()::text and (storage.foldername(name))[1]=auth.uid()::text);
-- Expose only the routing fields of explicitly public images, never private metadata.
create function public.community_public_image(target uuid) returns table(object_key text, visibility text, storage_provider text) language sql stable security definer set search_path=public as $$ select m.object_key,m.visibility::text,m.storage_provider from public.media m where m.id=target and m.visibility='public' $$;
revoke all on function public.community_public_image(uuid) from public;
grant execute on function public.community_public_image(uuid) to anon,authenticated;
commit;
