begin;
alter table public.posts drop constraint if exists posts_post_type_check;
alter table public.posts add constraint posts_post_type_check check (post_type in ('request','question','review','free'));
commit;
