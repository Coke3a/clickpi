-- Prevents a store owner from ever having more than one store row. Without
-- this, a failed initial fetch in the dashboard (useStore's .maybeSingle())
-- could let an owner submit the "create your store" form a second time,
-- after which .maybeSingle() would start erroring permanently (more than
-- one row) with no way to recover from the UI. The unique index turns that
-- second insert into a clear, surfaced error instead.
drop index if exists stores_owner_user_id_idx;
create unique index stores_owner_user_id_idx on stores (owner_user_id);
