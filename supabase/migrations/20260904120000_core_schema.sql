create extension if not exists pgcrypto;

create table stores (
  id bigint generated always as identity primary key,
  name text not null,
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index stores_owner_user_id_idx on stores (owner_user_id);

create table employees (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index employees_store_id_idx on employees (store_id);

create table destinations (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores(id) on delete cascade,
  label text not null,
  target_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index destinations_store_id_idx on destinations (store_id);

create table links (
  id bigint generated always as identity primary key,
  destination_id bigint not null references destinations(id) on delete cascade,
  employee_id bigint not null references employees(id) on delete cascade,
  store_id bigint not null references stores(id) on delete cascade,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (destination_id, employee_id)
);
create index links_destination_id_idx on links (destination_id);
create index links_employee_id_idx on links (employee_id);
create index links_store_id_idx on links (store_id);

create table clicks (
  id bigint generated always as identity primary key,
  link_id bigint not null references links(id) on delete cascade,
  destination_id bigint not null,
  employee_id bigint not null,
  store_id bigint not null,
  clicked_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  referrer text
);
create index clicks_link_id_idx on clicks (link_id);
create index clicks_store_id_clicked_at_idx on clicks (store_id, clicked_at desc);
create index clicks_destination_id_clicked_at_idx on clicks (destination_id, clicked_at desc);
create index clicks_employee_id_clicked_at_idx on clicks (employee_id, clicked_at desc);
