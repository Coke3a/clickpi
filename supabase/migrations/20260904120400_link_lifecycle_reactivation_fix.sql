-- Fixes two gaps in the link-lifecycle trigger subsystem introduced in
-- 20260904120200_link_lifecycle_triggers.sql. That migration has already
-- been applied, so behavior is corrected here via `create or replace
-- function` rather than by editing it; the `create trigger` statements in
-- that migration already bind to these function names and pick up the new
-- implementation automatically.
--
-- Finding 1 (reactivation is a dead control): deactivate_links_for_employee()
-- and deactivate_links_for_destination() only ever handled the true -> false
-- transition, so toggling an employee/destination back to active never
-- restored their links. Both now also handle false -> true, but only
-- reactivate a link when its OTHER parent is currently active too --
-- otherwise a link would be marked active while still unusable, which is
-- exactly the misleading-status problem described in Finding 2.
--
-- Finding 2 (new links ignore the counterpart's active state):
-- create_links_for_new_employee() and create_links_for_new_destination()
-- inserted links relying on the `links.active` column default (`true`),
-- regardless of whether the pre-existing counterpart row was active. Both
-- now set `active` explicitly from the counterpart's current state.

create or replace function deactivate_links_for_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active = true and new.active = false then
    update public.links set active = false where employee_id = new.id;
  elsif old.active = false and new.active = true then
    update public.links l
    set active = true
    from public.destinations d
    where l.employee_id = new.id
      and l.destination_id = d.id
      and d.active = true;
  end if;
  return new;
end;
$$;

create or replace function deactivate_links_for_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active = true and new.active = false then
    update public.links set active = false where destination_id = new.id;
  elsif old.active = false and new.active = true then
    update public.links l
    set active = true
    from public.employees e
    where l.destination_id = new.id
      and l.employee_id = e.id
      and e.active = true;
  end if;
  return new;
end;
$$;

create or replace function create_links_for_new_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.links (destination_id, employee_id, store_id, slug, active)
  select d.id, new.id, new.store_id, public.generate_link_slug(), d.active
  from public.destinations d
  where d.store_id = new.store_id;
  return new;
end;
$$;

create or replace function create_links_for_new_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.links (destination_id, employee_id, store_id, slug, active)
  select new.id, e.id, new.store_id, public.generate_link_slug(), e.active
  from public.employees e
  where e.store_id = new.store_id;
  return new;
end;
$$;
