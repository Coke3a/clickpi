# PAMM Map KPI — Product & Technical Design

**Status:** Approved for planning
**Date:** 2026-09-04

## 1. Problem

Shops ask customers to scan a QR code / click a link to leave a Google Maps
(or other platform) review. In practice, staff have to actively persuade
customers to do this. The shop owner has no way to measure which employee is
actually driving reviews/engagement — there's no per-employee attribution or
KPI visibility.

## 2. Goal

A SaaS product where a shop owner:

1. Registers their shop and defines one or more **destination URLs**
   (Google Maps review link, Facebook page, TikTok, or any other URL).
2. Adds their **employees**.
3. The system automatically generates a unique tracking link for every
   (destination × employee) combination.
4. When a customer clicks/scans an employee's link, the system logs the
   click (who, when) and redirects to the destination — instantly.
5. The owner views a **KPI dashboard**: who is driving the most
   clicks, per destination, per time period.

## 3. Non-goals (explicitly out of scope for MVP)

- Employee login/accounts — only the shop owner/admin logs in.
- QR code image generation — the system only produces the URL; printing a
  QR code from it is left to the owner (any QR generator works with a plain
  URL).
- Anti-fraud / de-duplication of clicks — MVP counts raw clicks only. IP and
  user-agent are captured on every click so fraud heuristics can be added
  later **without a schema migration**.
- Multiple branches under one account — one signup = one store. Multi-branch
  support is a possible future iteration, not MVP.
- Multiple staff accounts managing one dashboard — single owner login only.
- Native mobile app.

## 4. Architecture

```
                     ┌─────────────────────────────┐
                     │   Cloudflare Worker (Hono)   │
                     │                              │
  Customer scans ───▶│  GET /r/:slug                │──▶ Supabase (service role key)
                     │    → 302 redirect to          │      insert click (async, waitUntil)
                     │      destination.target_url   │
                     │                              │
  Owner opens app ──▶│  /* (static assets, React)   │
                     └─────────────────────────────┘
                                    │
                                    ▼ (direct, browser-side)
                     ┌─────────────────────────────┐
                     │   Supabase (Postgres + Auth)  │
                     │   RLS enforces tenant isolation│
                     └─────────────────────────────┘
```

- **One Cloudflare Worker** serves the React dashboard as static assets and
  owns exactly one dynamic route: `GET /r/:slug`. It holds the Supabase
  **service role key** as a secret, used only for that route (public,
  unauthenticated, write-only to `clicks`).
- **The React dashboard talks to Supabase directly** (via `supabase-js`,
  browser-side, using the user's session JWT). There is no custom REST API
  layer for CRUD or KPI reads — Postgres Row-Level Security (RLS) enforces
  tenant isolation regardless of how a query is issued, so a proxy API adds
  no security value here, only more code to maintain.
- **Business rules that must always hold** (e.g., auto-creating links) live
  as Postgres triggers, not application code — this guarantees consistency
  no matter which client writes the row.

### Why this shape (vs. a custom backend API)

Rejected: building a Hono REST API (`/api/employees`, `/api/destinations`,
`/api/kpi/*`) in front of Supabase. It would duplicate what RLS + Postgres
functions already provide, doubling the surface area to test and maintain
for zero additional security or functionality. The Worker's backend
responsibility is deliberately narrow: the one thing that *must* run
server-side (the public redirect + trusted click-write) and nothing else.

## 5. Data model

```sql
-- shops (tenant boundary)
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

-- a destination URL the store wants clicks driven to
-- (Google Maps review, Facebook page, TikTok, anything)
create table destinations (
  id bigint generated always as identity primary key,
  store_id bigint not null references stores(id) on delete cascade,
  label text not null,
  target_url text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index destinations_store_id_idx on destinations (store_id);

-- one row per (destination × employee) combination = one trackable URL
create table links (
  id bigint generated always as identity primary key,
  destination_id bigint not null references destinations(id) on delete cascade,
  employee_id bigint not null references employees(id) on delete cascade,
  store_id bigint not null references stores(id) on delete cascade, -- denormalized for RLS + query speed
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (destination_id, employee_id)
);
create index links_destination_id_idx on links (destination_id);
create index links_employee_id_idx on links (employee_id);
create index links_store_id_idx on links (store_id);

-- raw click log
create table clicks (
  id bigint generated always as identity primary key,
  link_id bigint not null references links(id) on delete cascade,
  destination_id bigint not null, -- denormalized: KPI-by-destination without a join
  employee_id bigint not null,    -- denormalized: KPI-by-employee without a join
  store_id bigint not null,       -- denormalized: RLS filters directly on this
  clicked_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  referrer text
);
create index clicks_link_id_idx on clicks (link_id);
create index clicks_store_id_clicked_at_idx on clicks (store_id, clicked_at desc);
create index clicks_destination_id_clicked_at_idx on clicks (destination_id, clicked_at desc);
create index clicks_employee_id_clicked_at_idx on clicks (employee_id, clicked_at desc);
```

Design notes:

- `bigint identity` primary keys everywhere (not random UUIDv4) — avoids
  index fragmentation on high-write tables like `clicks` as data grows.
  `owner_user_id` is `uuid` because it references Supabase's own
  `auth.users.id`, which is not a table we control.
- `slug` is a randomly-generated, globally-unique token (not derived from
  employee/store names) — prevents guessing/enumerating other stores' links.
- Denormalized `store_id`/`destination_id`/`employee_id` on `clicks` trade a
  small amount of write-time redundancy for fast, join-free KPI queries and
  simple, indexed RLS policies — important since `clicks` is the
  highest-write, highest-read table in the system.
- Privacy note: `ip_address`/`user_agent` are stored for future
  anti-abuse work. This must be disclosed in the product's privacy policy
  (PDPA).

### Auto-generation trigger (cross-product)

Adding an employee creates a link for every existing destination; adding a
destination creates a link for every existing employee. This is a database
trigger, not frontend logic, so it holds regardless of client:

```sql
create or replace function create_links_for_new_employee()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.links (destination_id, employee_id, store_id, slug)
  select d.id, new.id, new.store_id, encode(gen_random_bytes(6), 'base64url')
  from public.destinations d
  where d.store_id = new.store_id;
  return new;
end;
$$;
create trigger employees_create_links
  after insert on employees
  for each row execute function create_links_for_new_employee();

-- symmetric trigger on destinations, same pattern
```

Deactivating an employee or destination cascades `active = false` to its
`links` (application-level update in the same transaction, or a mirrored
trigger — implementation detail for the plan).

### Row-Level Security

All four tenant tables (`stores`, `employees`, `destinations`, `links`,
`clicks`) have RLS enabled, scoped to the authenticated owner:

```sql
create policy stores_owner on stores for all to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy employees_owner on employees for all to authenticated
  using (store_id in (select id from stores where owner_user_id = (select auth.uid())));

-- destinations, links, clicks: same store_id-based policy
```

`auth.uid()` is wrapped in a `select` so Postgres caches it once per query
instead of once per row (critical for `clicks`, which can have many rows).
Every column used in a policy (`owner_user_id`, `store_id`) is indexed.

The redirect endpoint (`/r/:slug`) never runs as `authenticated` — it uses
the Supabase **service role key** server-side in the Worker, which bypasses
RLS entirely. This is intentional: there is no logged-in user at that point
in the flow.

## 6. Redirect flow (`GET /r/:slug`)

```
1. Look up link by slug, joined to destination + employee + store.
   - Not found, or link/employee/destination/store inactive
     → render a small "this link is no longer active" fallback page (not a bare 404).
2. c.executionCtx.waitUntil(insert into clicks ...)
   - Fire-and-forget: the customer's redirect never waits on this write.
   - If the insert fails, log the error (observability) but never block or
     retry-block the redirect — a missed KPI log is acceptable, a broken
     redirect is not.
3. return Response.redirect(destination.target_url, 302)
```

## 7. KPI dashboard

Screens:

1. **Login** (Supabase Auth, email/password) → first login prompts store
   creation (name only).
2. **Destinations** — list/add/edit/deactivate target URLs.
3. **Employees** — list/add/edit/deactivate staff.
4. **Links** — read-only table of all (destination × employee) links with a
   copy-URL button per row. Created automatically; nothing to configure.
5. **KPI dashboard** (home) —
   - Leaderboard: employees ranked by click count, filterable by date range
     and by destination (tab: All / Google Maps / Facebook / TikTok / …).
   - Trend chart: clicks over time (day/week/month granularity), same filters.
   - CSV export of the currently filtered view (built client-side from the
     already-fetched query result — no server endpoint needed).

Data access: the dashboard queries Supabase directly. Leaderboard and trend
data are exposed as `security invoker` Postgres functions (respect the
caller's RLS) callable via `supabase.rpc(...)`:

- `get_leaderboard(from, to, destination_id default null)`
- `get_click_trend(from, to, destination_id default null, granularity default 'day')`

## 8. Error handling

- Redirect endpoint: invalid/inactive slug → friendly fallback page, never a
  raw error. Click-log failures never block the redirect (see §6).
- Dashboard: standard loading/empty/error states. Empty state matters most
  for a brand-new store (no destinations/employees yet) — the UI should
  guide the owner to add a destination first, then employees.
- Destination/employee names are not unique keys — only `slug` and
  `(destination_id, employee_id)` are constrained at the DB level.

## 9. Testing approach

Priorities, in order of what's most trust-critical:

1. **Redirect correctness** — Hono test client: valid slug → 302 with
   correct `Location`; inactive/missing slug → fallback page, not a crash;
   click insert is attempted but its failure doesn't affect the response.
2. **RLS isolation** — integration tests asserting a store owner can never
   read another store's `employees`/`destinations`/`links`/`clicks`, even
   with a crafted request.
3. **Trigger consistency** — inserting an employee creates links for every
   existing destination (and vice versa); deactivating a parent deactivates
   its links.
4. Dashboard components — standard component-level tests for the
   leaderboard/chart/filter interactions; manual verification in-browser is
   acceptable for MVP given the low complexity of the UI logic.

## 10. Tech stack summary

- **Runtime/hosting:** Cloudflare Workers (single Worker: static assets +
  `/r/:slug`)
- **Backend framework:** Hono (chosen over ElysiaJS — Elysia's Cloudflare
  adapter is explicitly experimental as of 2026, and Elysia's benchmark
  speed advantage is tied to Bun-specific optimizations that don't carry
  over to the Workers/V8-isolate runtime, where Hono is the proven,
  purpose-built choice)
- **Database + Auth:** Supabase (Postgres, RLS, Auth), accessed via
  `supabase-js`
- **Frontend:** React (Vite), built as static assets served by the same
  Worker

## 11. Open questions for a future iteration (not blocking MVP)

- Anti-fraud heuristics on `clicks` (rate-limit by IP/device within a time
  window) — data is already captured, so this can be added later without a
  migration.
- Multi-branch / multiple staff dashboard accounts per store.
- QR code generation from a link's URL.
- Custom short domain for `/r/:slug` (cosmetic; current design already
  works on any domain the Worker is bound to).
