begin;
insert into categories(id,domain,name,sort) values
 ('청소·관리','consumer','청소·관리',1),
 ('공간·시공','consumer','공간·시공',4),
 ('제작·디지털','consumer','제작·디지털',6)
on conflict(id) do update set name=excluded.name,sort=excluded.sort,active=true;
update categories set sort=7 where id='기타';
update posts set category_id=case category_id when '청소' then '청소·관리' when '인테리어·시공' then '공간·시공' end where audience='consumer' and category_id in ('청소','인테리어·시공');
-- Keep old IDs for references in later-phase tables; hide them in new selections.
update categories set active=false where id in ('청소','인테리어·시공');
alter table posts add column service_mode text not null default 'local' check(service_mode in ('local','online'));
alter table posts add constraint post_service_region check((service_mode='online' and region='전국 · 온라인') or (service_mode='local' and region<>'전국 · 온라인'));
commit;
