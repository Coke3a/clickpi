alter table stores enable row level security;
alter table employees enable row level security;
alter table destinations enable row level security;
alter table links enable row level security;
alter table clicks enable row level security;

create policy stores_owner on stores
  for all to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

create policy employees_owner on employees
  for all to authenticated
  using (store_id in (select id from stores where owner_user_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_user_id = (select auth.uid())));

create policy destinations_owner on destinations
  for all to authenticated
  using (store_id in (select id from stores where owner_user_id = (select auth.uid())))
  with check (store_id in (select id from stores where owner_user_id = (select auth.uid())));

create policy links_owner_read on links
  for select to authenticated
  using (store_id in (select id from stores where owner_user_id = (select auth.uid())));

create policy clicks_owner_read on clicks
  for select to authenticated
  using (store_id in (select id from stores where owner_user_id = (select auth.uid())));
