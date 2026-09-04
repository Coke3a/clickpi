-- gen_random_bytes is schema-qualified as extensions.gen_random_bytes because
-- Supabase installs pgcrypto into the `extensions` schema, not `public`, and
-- the SECURITY DEFINER trigger functions below set `search_path = ''`; an
-- unqualified call gets inlined into that empty-search_path context and fails
-- to resolve.
create or replace function generate_link_slug()
returns text
language sql
as $$
  select encode(extensions.gen_random_bytes(6), 'hex');
$$;

create or replace function create_links_for_new_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.links (destination_id, employee_id, store_id, slug)
  select d.id, new.id, new.store_id, public.generate_link_slug()
  from public.destinations d
  where d.store_id = new.store_id;
  return new;
end;
$$;

create trigger employees_create_links
  after insert on employees
  for each row execute function create_links_for_new_employee();

create or replace function create_links_for_new_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.links (destination_id, employee_id, store_id, slug)
  select new.id, e.id, new.store_id, public.generate_link_slug()
  from public.employees e
  where e.store_id = new.store_id;
  return new;
end;
$$;

create trigger destinations_create_links
  after insert on destinations
  for each row execute function create_links_for_new_destination();

create or replace function deactivate_links_for_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active = true and new.active = false then
    update public.links set active = false where employee_id = new.id;
  end if;
  return new;
end;
$$;

create trigger employees_deactivate_links
  after update of active on employees
  for each row execute function deactivate_links_for_employee();

create or replace function deactivate_links_for_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active = true and new.active = false then
    update public.links set active = false where destination_id = new.id;
  end if;
  return new;
end;
$$;

create trigger destinations_deactivate_links
  after update of active on destinations
  for each row execute function deactivate_links_for_destination();
