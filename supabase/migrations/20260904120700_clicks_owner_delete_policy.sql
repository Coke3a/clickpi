-- Lets a store owner clear their own click history (e.g. to remove test
-- clicks made while setting up links) without needing a service-role proxy.
-- Follows the same store_id-scoped pattern as the other owner policies.
create policy clicks_owner_delete on clicks
  for delete to authenticated
  using (store_id in (select id from stores where owner_user_id = (select auth.uid())));
