# PAMM Map KPI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant SaaS where a shop owner defines destination URLs (Google Maps, Facebook, TikTok, ...) and employees, gets an auto-generated per-(destination × employee) tracking link, and views a KPI dashboard of who drove the most clicks.

**Architecture:** One Cloudflare Worker (Hono) serves the React (Vite) dashboard as static assets and owns exactly one dynamic route, `GET /r/:slug`, which logs a click and 302-redirects. The dashboard talks to Supabase (Postgres + Auth) directly from the browser; Postgres Row-Level Security enforces tenant isolation and Postgres triggers keep the destination × employee link matrix consistent. There is no custom REST API layer.

**Tech Stack:** Cloudflare Workers, Hono, `@cloudflare/vite-plugin`, React 19 + Vite, React Router, Supabase (Postgres/Auth/`supabase-js`), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-pamm-map-kpi-design.md`

## Global Constraints

- Backend framework is Hono — never ElysiaJS (spec §11: Elysia's Cloudflare adapter is experimental and its speed advantage doesn't carry over to Workers).
- Every application table's primary key is `bigint generated always as identity` — never a random UUIDv4 (spec §5).
- RLS is enabled on `stores`, `employees`, `destinations`, `links`, `clicks`; every policy wraps `auth.uid()` in `(select ...)` (spec §5).
- No custom REST API layer in the Worker. The dashboard talks to Supabase directly; the Worker serves static assets plus exactly one route, `GET /r/:slug` (spec §4).
- Business rules that must always hold — link auto-creation on the destination×employee cross-product, deactivation cascading to a parent's links — live as Postgres triggers, never application code (spec §4–5).
- The click-log write must never block or fail the redirect response (spec §6, §9).
- Config is split: `.env.example` (`VITE_`-prefixed, safe client-side) vs `.dev.vars.example` (Worker secrets). `SUPABASE_SERVICE_ROLE_KEY` must never reach the frontend bundle (spec §12).
- Chart data colors stay distinct from the decorative pastel chrome — click-count encodings use the dataviz skill's sequential blue (`#2a78d6` light-mode step 400), never a chrome pastel (spec §8).
- Base UI tokens for this plan are a literal, minimal port of `/Users/coke/Projects/qr-code`'s validated tokens (spec §8); a dedicated visual-polish task (Task 14) later adapts them into this product's own identity via the `impeccable:impeccable` skill — earlier tasks intentionally ship functional, not-yet-polished UI.

---

## File Structure

```
pamm-map-kpi/
├── package.json, tsconfig.json, tsconfig.worker.json
├── vite.config.ts, wrangler.jsonc, index.html
├── .gitignore, .env.example, .dev.vars.example
├── supabase/
│   ├── config.toml                                (from `supabase init`)
│   └── migrations/
│       ├── 20260904120000_core_schema.sql
│       ├── 20260904120100_rls_policies.sql
│       ├── 20260904120200_link_lifecycle_triggers.sql
│       └── 20260904120300_kpi_functions.sql
├── src/
│   ├── worker/
│   │   ├── env.ts                                  Env binding types
│   │   ├── linksRepository.ts                      LinksRepository interface + types
│   │   ├── supabaseLinksRepository.ts               Supabase-backed implementation
│   │   ├── redirect.ts                              makeRedirectHandler()
│   │   ├── redirect.test.ts
│   │   └── index.ts                                 Hono app entry
│   └── web/
│       ├── main.tsx, App.tsx
│       ├── lib/
│       │   ├── supabaseClient.ts
│       │   ├── useCollection.ts
│       │   ├── csv.ts, csv.test.ts
│       ├── auth/
│       │   ├── AuthProvider.tsx
│       │   ├── RequireAuth.tsx
│       │   ├── LoginPage.tsx, LoginPage.css, LoginPage.test.tsx
│       ├── store/
│       │   ├── useStore.ts
│       │   └── CreateStorePage.tsx
│       ├── layout/
│       │   └── DashboardLayout.tsx
│       ├── destinations/
│       │   ├── DestinationsPage.tsx, DestinationsPage.test.tsx
│       ├── employees/
│       │   ├── EmployeesPage.tsx, EmployeesPage.test.tsx
│       ├── links/
│       │   ├── LinksPage.tsx, LinksPage.test.tsx
│       ├── kpi/
│       │   ├── dateRangePresets.ts
│       │   ├── Leaderboard.tsx, Leaderboard.css
│       │   ├── TrendChart.tsx, TrendChart.css
│       │   ├── KpiDashboardPage.tsx, KpiDashboardPage.test.tsx
│       └── theme/
│           ├── tokens.css, base.css
└── test/
    └── db/
        ├── helpers.ts
        ├── schema.test.ts
        ├── rls.test.ts
        ├── triggers.test.ts
        └── kpiFunctions.test.ts
```

---

### Task 1: Project scaffolding & toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.worker.json`, `vite.config.ts`, `wrangler.jsonc`, `index.html`, `.gitignore`, `.env.example`, `.dev.vars.example`, `vitest.config.ts`
- Create: `src/worker/index.ts`
- Test: `src/worker/health.test.ts`

**Interfaces:**
- Produces: a Hono `app` default-exported from `src/worker/index.ts`, with a `GET /health` route returning `{ status: 'ok' }` — this is the toolchain smoke test, not a product feature. Task 6 adds the real `/r/:slug` route to this same `app`.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "pamm-map-kpi",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "deploy": "vite build && wrangler deploy",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.worker.json --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "hono": "^4.6.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@cloudflare/vite-plugin": "^1.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json` (frontend) and `tsconfig.worker.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src/web", "vite.config.ts", "vitest.config.ts", "test"]
}
```

`tsconfig.worker.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/worker"]
}
```

- [ ] **Step 3: Write `vite.config.ts`, `wrangler.jsonc`, `index.html`, `vitest.config.ts`**

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [react(), cloudflare()],
})
```

`wrangler.jsonc`:
```jsonc
{
  "name": "pamm-map-kpi",
  "main": "src/worker/index.ts",
  "compatibility_date": "2026-09-01",
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application"
  }
}
```

`index.html` (repo root):
```html
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PAMM Map KPI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/web/main.tsx"></script>
  </body>
</html>
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Write `.gitignore`, `.env.example`, `.dev.vars.example`**

`.gitignore`:
```
node_modules/
dist/
.env
.env.local
.dev.vars
.wrangler/
supabase/.branches/
supabase/.temp/
```

`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.dev.vars.example`:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Write the health-check route and its failing test**

`src/worker/health.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import app from './index'

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
```

Run: `npx vitest run src/worker/health.test.ts`
Expected: FAIL (`./index` has no default export yet, or route missing).

- [ ] **Step 6: Implement `src/worker/index.ts`**

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/worker/health.test.ts`
Expected: PASS

- [ ] **Step 8: Verify the build toolchain end-to-end**

Run: `npm install && npm run typecheck && npm run build`
Expected: no type errors; `dist/client/` and the built worker are produced without error.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json tsconfig.worker.json vite.config.ts vitest.config.ts \
  vitest.setup.ts wrangler.jsonc index.html .gitignore .env.example .dev.vars.example \
  src/worker/index.ts src/worker/health.test.ts package-lock.json
git commit -m "chore: scaffold Cloudflare Worker + Vite/React toolchain"
```

---

### Task 2: Supabase project init & core schema

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/20260904120000_core_schema.sql`
- Create: `test/db/helpers.ts`
- Test: `test/db/schema.test.ts`

**Interfaces:**
- Produces: `serviceClient()` and `createAuthedUser()` from `test/db/helpers.ts`, reused by every later `test/db/*.test.ts` task.
- Produces (DB): tables `stores`, `employees`, `destinations`, `links`, `clicks` exactly as specified below, with all listed indexes.

- [ ] **Step 1: Initialize the local Supabase project**

Run: `npx supabase init` (creates `supabase/config.toml`), then `npx supabase start`
Expected: local stack starts; note the printed API URL, `anon key`, and `service_role key` — for the default `config.toml` these are the well-known local demo values used in Step 2 below.

- [ ] **Step 2: Write the test helpers**

`test/db/helpers.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_TEST_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3Njk2MDAsImV4cCI6MTc5OTUzNjAwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTYwMCwiZXhwIjoxNzk5NTM2MDAwfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

let counter = 0

export async function createAuthedUser(): Promise<{ userId: string; client: SupabaseClient }> {
  counter += 1
  const email = `test-user-${Date.now()}-${counter}@example.com`
  const password = 'test-password-123!'
  const admin = serviceClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    throw new Error(`failed to create test user: ${createError?.message}`)
  }

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({ email, password })
  if (signInError || !signedIn.session) {
    throw new Error(`failed to sign in test user: ${signInError?.message}`)
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signedIn.session.access_token}` } },
  })

  return { userId: created.user.id, client }
}
```

- [ ] **Step 2: Write the failing schema test**

`test/db/schema.test.ts`:
```ts
import { describe, it, expect, afterEach } from 'vitest'
import { serviceClient } from './helpers'

describe('core schema constraints', () => {
  const cleanupStoreIds: number[] = []

  afterEach(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds.splice(0)) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  it('enforces one link per (destination, employee) pair', async () => {
    const admin = serviceClient()

    const { data: authUser } = await admin.auth.admin.createUser({
      email: `schema-test-${Date.now()}@example.com`,
      password: 'test-password-123!',
      email_confirm: true,
    })

    const { data: store, error: storeError } = await admin
      .from('stores')
      .insert({ name: 'Schema Test Store', owner_user_id: authUser!.user!.id })
      .select()
      .single()
    expect(storeError).toBeNull()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Google Maps', target_url: 'https://maps.google.com/x' })
      .select()
      .single()

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Somchai' })
      .select()
      .single()

    const { error: firstLinkError } = await admin.from('links').insert({
      store_id: store!.id,
      destination_id: destination!.id,
      employee_id: employee!.id,
      slug: 'schema-test-slug-1',
    })
    expect(firstLinkError).toBeNull()

    const { error: duplicateLinkError } = await admin.from('links').insert({
      store_id: store!.id,
      destination_id: destination!.id,
      employee_id: employee!.id,
      slug: 'schema-test-slug-2',
    })
    expect(duplicateLinkError).not.toBeNull()
    expect(duplicateLinkError!.message).toMatch(/duplicate key value/i)
  })
})
```

Run: `npx vitest run test/db/schema.test.ts`
Expected: FAIL (relation "stores" does not exist).

- [ ] **Step 3: Write the migration**

`supabase/migrations/20260904120000_core_schema.sql`:
```sql
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
```

- [ ] **Step 4: Apply the migration and run the test**

Run: `npx supabase db reset` (applies all migrations against the local instance), then `npx vitest run test/db/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml supabase/migrations/20260904120000_core_schema.sql \
  test/db/helpers.ts test/db/schema.test.ts
git commit -m "feat(db): add core schema (stores, employees, destinations, links, clicks)"
```

---

### Task 3: Row-Level Security policies

**Files:**
- Create: `supabase/migrations/20260904120100_rls_policies.sql`
- Test: `test/db/rls.test.ts`

**Interfaces:**
- Consumes: `serviceClient()`, `createAuthedUser()` from `test/db/helpers.ts` (Task 2).
- Produces: RLS enabled + policies on all 5 tables — every later authenticated-role query in the frontend relies on this for tenant isolation.

- [ ] **Step 1: Write the failing RLS test**

`test/db/rls.test.ts`:
```ts
import { describe, it, expect, afterAll } from 'vitest'
import { serviceClient, createAuthedUser } from './helpers'

describe('row-level security isolation', () => {
  const cleanupStoreIds: number[] = []

  afterAll(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  it('lets an owner see only their own store', async () => {
    const admin = serviceClient()
    const ownerA = await createAuthedUser()
    const ownerB = await createAuthedUser()

    const { data: storeA } = await admin
      .from('stores')
      .insert({ name: 'Store A', owner_user_id: ownerA.userId })
      .select()
      .single()
    cleanupStoreIds.push(storeA!.id)

    const { data: seenByA } = await ownerA.client.from('stores').select('*')
    expect(seenByA).toHaveLength(1)
    expect(seenByA![0].id).toBe(storeA!.id)

    const { data: seenByB } = await ownerB.client.from('stores').select('*')
    expect(seenByB).toHaveLength(0)
  })

  it("blocks an owner from reading another store's employees, destinations, links, and clicks", async () => {
    const admin = serviceClient()
    const ownerA = await createAuthedUser()
    const ownerB = await createAuthedUser()

    const { data: storeA } = await admin
      .from('stores')
      .insert({ name: 'Store A2', owner_user_id: ownerA.userId })
      .select()
      .single()
    cleanupStoreIds.push(storeA!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: storeA!.id, label: 'Facebook', target_url: 'https://facebook.com/x' })
      .select()
      .single()

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: storeA!.id, name: 'Nok' })
      .select()
      .single()

    const { data: link } = await admin
      .from('links')
      .insert({
        store_id: storeA!.id,
        destination_id: destination!.id,
        employee_id: employee!.id,
        slug: 'rls-test-slug-1',
      })
      .select()
      .single()

    await admin.from('clicks').insert({
      link_id: link!.id,
      destination_id: destination!.id,
      employee_id: employee!.id,
      store_id: storeA!.id,
    })

    const { data: employeesSeenByB } = await ownerB.client
      .from('employees')
      .select('*')
      .eq('store_id', storeA!.id)
    expect(employeesSeenByB).toHaveLength(0)

    const { data: destinationsSeenByB } = await ownerB.client
      .from('destinations')
      .select('*')
      .eq('store_id', storeA!.id)
    expect(destinationsSeenByB).toHaveLength(0)

    const { data: linksSeenByB } = await ownerB.client.from('links').select('*').eq('store_id', storeA!.id)
    expect(linksSeenByB).toHaveLength(0)

    const { data: clicksSeenByB } = await ownerB.client.from('clicks').select('*').eq('store_id', storeA!.id)
    expect(clicksSeenByB).toHaveLength(0)

    const { data: employeesSeenByA } = await ownerA.client
      .from('employees')
      .select('*')
      .eq('store_id', storeA!.id)
    expect(employeesSeenByA).toHaveLength(1)
  })

  it('prevents authenticated users from directly inserting links (only triggers/service role may)', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'Store C', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'TikTok', target_url: 'https://tiktok.com/x' })
      .select()
      .single()

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Beam' })
      .select()
      .single()

    const { error } = await owner.client.from('links').insert({
      store_id: store!.id,
      destination_id: destination!.id,
      employee_id: employee!.id,
      slug: 'should-not-be-allowed',
    })
    expect(error).not.toBeNull()
  })
})
```

Run: `npx vitest run test/db/rls.test.ts`
Expected: FAIL (RLS not yet enabled, so owner B can see owner A's data).

- [ ] **Step 2: Write the migration**

`supabase/migrations/20260904120100_rls_policies.sql`:
```sql
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
```

- [ ] **Step 3: Apply the migration and run the test**

Run: `npx supabase db reset && npx vitest run test/db/rls.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260904120100_rls_policies.sql test/db/rls.test.ts
git commit -m "feat(db): enforce tenant isolation with row-level security"
```

---

### Task 4: Link lifecycle triggers (auto-create & deactivation cascade)

**Files:**
- Create: `supabase/migrations/20260904120200_link_lifecycle_triggers.sql`
- Test: `test/db/triggers.test.ts`

**Interfaces:**
- Consumes: `serviceClient()` from `test/db/helpers.ts` (Task 2).
- Produces (DB): inserting an `employee` or `destination` auto-creates the missing `links` rows; setting `active = false` on an `employee`/`destination` cascades to its `links`. Task 6 (redirect handler) and every dashboard screen assume links always exist for every (destination × employee) pair without any client ever inserting a `links` row directly.

- [ ] **Step 1: Write the failing trigger tests**

`test/db/triggers.test.ts`:
```ts
import { describe, it, expect, afterEach } from 'vitest'
import { serviceClient } from './helpers'

describe('link lifecycle triggers', () => {
  const cleanupStoreIds: number[] = []

  afterEach(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds.splice(0)) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  async function makeStore() {
    const admin = serviceClient()
    const { data: authUser } = await admin.auth.admin.createUser({
      email: `trigger-test-${Date.now()}-${Math.random()}@example.com`,
      password: 'test-password-123!',
      email_confirm: true,
    })
    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'Trigger Test Store', owner_user_id: authUser!.user!.id })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)
    return store!.id as number
  }

  it('creates a link for every existing destination when a new employee is added', async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    await admin.from('destinations').insert([
      { store_id: storeId, label: 'Google Maps', target_url: 'https://maps.google.com/1' },
      { store_id: storeId, label: 'Facebook', target_url: 'https://facebook.com/1' },
    ])

    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: storeId, name: 'Fah' })
      .select()
      .single()

    const { data: links } = await admin.from('links').select('*').eq('employee_id', employee!.id)
    expect(links).toHaveLength(2)
    expect(new Set(links!.map((l) => l.destination_id)).size).toBe(2)
  })

  it('creates a link for every existing employee when a new destination is added', async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    await admin.from('employees').insert([
      { store_id: storeId, name: 'Ploy' },
      { store_id: storeId, name: 'Beam' },
      { store_id: storeId, name: 'Nok' },
    ])

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: storeId, label: 'TikTok', target_url: 'https://tiktok.com/1' })
      .select()
      .single()

    const { data: links } = await admin.from('links').select('*').eq('destination_id', destination!.id)
    expect(links).toHaveLength(3)
  })

  it("deactivates an employee's links when the employee is deactivated", async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    await admin
      .from('destinations')
      .insert({ store_id: storeId, label: 'Google Maps', target_url: 'https://maps.google.com/2' })
    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: storeId, name: 'Golf' })
      .select()
      .single()

    await admin.from('employees').update({ active: false }).eq('id', employee!.id)

    const { data: links } = await admin.from('links').select('*').eq('employee_id', employee!.id)
    expect(links!.every((l) => l.active === false)).toBe(true)
  })

  it("deactivates a destination's links when the destination is deactivated", async () => {
    const admin = serviceClient()
    const storeId = await makeStore()

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: storeId, label: 'Facebook', target_url: 'https://facebook.com/2' })
      .select()
      .single()
    await admin.from('employees').insert({ store_id: storeId, name: 'Ice' })

    await admin.from('destinations').update({ active: false }).eq('id', destination!.id)

    const { data: links } = await admin.from('links').select('*').eq('destination_id', destination!.id)
    expect(links!.every((l) => l.active === false)).toBe(true)
  })
})
```

Run: `npx vitest run test/db/triggers.test.ts`
Expected: FAIL (no links are auto-created; `links` stays empty).

- [ ] **Step 2: Write the migration**

`supabase/migrations/20260904120200_link_lifecycle_triggers.sql`. Note: the slug generator uses `hex` encoding, not `base64url` — Postgres only gained a `base64url` `encode()` format in version 19, which cannot be assumed here.

```sql
create or replace function generate_link_slug()
returns text
language sql
as $$
  select encode(gen_random_bytes(6), 'hex');
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
```

- [ ] **Step 3: Apply the migration and run the tests**

Run: `npx supabase db reset && npx vitest run test/db/triggers.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260904120200_link_lifecycle_triggers.sql test/db/triggers.test.ts
git commit -m "feat(db): auto-generate and cascade-deactivate destination x employee links"
```

---

### Task 5: KPI RPC functions

**Files:**
- Create: `supabase/migrations/20260904120300_kpi_functions.sql`
- Test: `test/db/kpiFunctions.test.ts`

**Interfaces:**
- Consumes: `serviceClient()`, `createAuthedUser()` from `test/db/helpers.ts` (Task 2).
- Produces (DB): `get_leaderboard(p_from timestamptz, p_to timestamptz, p_destination_id bigint default null)` returning `(employee_id bigint, employee_name text, click_count bigint)`, and `get_click_trend(p_from timestamptz, p_to timestamptz, p_destination_id bigint default null, p_granularity text default 'day')` returning `(bucket timestamptz, click_count bigint)`. Tasks 12 and 13 call these via `supabase.rpc(...)`.

- [ ] **Step 1: Write the failing function tests**

`test/db/kpiFunctions.test.ts`:
```ts
import { describe, it, expect, afterAll } from 'vitest'
import { serviceClient, createAuthedUser } from './helpers'

describe('KPI RPC functions', () => {
  const cleanupStoreIds: number[] = []

  afterAll(async () => {
    const admin = serviceClient()
    for (const id of cleanupStoreIds) {
      await admin.from('stores').delete().eq('id', id)
    }
  })

  it('ranks employees by click count within the given range and destination', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'KPI Test Store', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Google Maps', target_url: 'https://maps.google.com/3' })
      .select()
      .single()

    const { data: employees } = await admin
      .from('employees')
      .insert([
        { store_id: store!.id, name: 'Top Performer' },
        { store_id: store!.id, name: 'Low Performer' },
      ])
      .select()

    const [top, low] = employees!
    const { data: links } = await admin.from('links').select('*').eq('destination_id', destination!.id)

    const topLink = links!.find((l) => l.employee_id === top.id)!
    const lowLink = links!.find((l) => l.employee_id === low.id)!

    await admin.from('clicks').insert([
      { link_id: topLink.id, employee_id: top.id, destination_id: destination!.id, store_id: store!.id },
      { link_id: topLink.id, employee_id: top.id, destination_id: destination!.id, store_id: store!.id },
      { link_id: lowLink.id, employee_id: low.id, destination_id: destination!.id, store_id: store!.id },
    ])

    const { data: leaderboard, error } = await owner.client.rpc('get_leaderboard', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: destination!.id,
    })

    expect(error).toBeNull()
    expect(leaderboard![0].employee_id).toBe(top.id)
    expect(leaderboard![0].click_count).toBe(2)
    expect(leaderboard![1].employee_id).toBe(low.id)
    expect(leaderboard![1].click_count).toBe(1)
  })

  it('buckets clicks by day for the trend function', async () => {
    const admin = serviceClient()
    const owner = await createAuthedUser()

    const { data: store } = await admin
      .from('stores')
      .insert({ name: 'KPI Trend Store', owner_user_id: owner.userId })
      .select()
      .single()
    cleanupStoreIds.push(store!.id)

    const { data: destination } = await admin
      .from('destinations')
      .insert({ store_id: store!.id, label: 'Facebook', target_url: 'https://facebook.com/3' })
      .select()
      .single()
    const { data: employee } = await admin
      .from('employees')
      .insert({ store_id: store!.id, name: 'Trend Tester' })
      .select()
      .single()
    const { data: link } = await admin
      .from('links')
      .select('*')
      .eq('destination_id', destination!.id)
      .eq('employee_id', employee!.id)
      .single()

    await admin.from('clicks').insert([
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id },
      { link_id: link!.id, employee_id: employee!.id, destination_id: destination!.id, store_id: store!.id },
    ])

    const { data: trend, error } = await owner.client.rpc('get_click_trend', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: destination!.id,
      p_granularity: 'day',
    })

    expect(error).toBeNull()
    expect(trend).toHaveLength(1)
    expect(trend![0].click_count).toBe(2)
  })

  it('rejects an invalid granularity', async () => {
    const owner = await createAuthedUser()
    const { error } = await owner.client.rpc('get_click_trend', {
      p_from: '2000-01-01T00:00:00Z',
      p_to: '2100-01-01T00:00:00Z',
      p_destination_id: null,
      p_granularity: 'year',
    })
    expect(error).not.toBeNull()
  })
})
```

Run: `npx vitest run test/db/kpiFunctions.test.ts`
Expected: FAIL (function `get_leaderboard` does not exist).

- [ ] **Step 2: Write the migration**

`supabase/migrations/20260904120300_kpi_functions.sql`:
```sql
create or replace function get_leaderboard(
  p_from timestamptz,
  p_to timestamptz,
  p_destination_id bigint default null
)
returns table (employee_id bigint, employee_name text, click_count bigint)
language sql
security invoker
set search_path = ''
as $$
  select e.id, e.name, count(c.id)::bigint
  from public.employees e
  left join public.clicks c
    on c.employee_id = e.id
    and c.clicked_at >= p_from
    and c.clicked_at < p_to
    and (p_destination_id is null or c.destination_id = p_destination_id)
  group by e.id, e.name
  order by count(c.id) desc, e.name asc;
$$;

create or replace function get_click_trend(
  p_from timestamptz,
  p_to timestamptz,
  p_destination_id bigint default null,
  p_granularity text default 'day'
)
returns table (bucket timestamptz, click_count bigint)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'invalid granularity: %', p_granularity;
  end if;

  return query
    select date_trunc(p_granularity, c.clicked_at) as bucket, count(*)::bigint
    from public.clicks c
    where c.clicked_at >= p_from
      and c.clicked_at < p_to
      and (p_destination_id is null or c.destination_id = p_destination_id)
    group by 1
    order by 1;
end;
$$;
```

- [ ] **Step 3: Apply the migration and run the tests**

Run: `npx supabase db reset && npx vitest run test/db/kpiFunctions.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260904120300_kpi_functions.sql test/db/kpiFunctions.test.ts
git commit -m "feat(db): add get_leaderboard and get_click_trend KPI functions"
```

---

### Task 6: Worker redirect endpoint (`GET /r/:slug`)

**Files:**
- Create: `src/worker/env.ts`, `src/worker/linksRepository.ts`, `src/worker/supabaseLinksRepository.ts`, `src/worker/redirect.ts`
- Modify: `src/worker/index.ts`
- Test: `src/worker/redirect.test.ts`

**Interfaces:**
- Consumes: `Hono` app from `src/worker/index.ts` (Task 1).
- Produces: `LinksRepository` interface (`findActiveLinkBySlug`, `recordClick`) from `linksRepository.ts`; `makeRedirectHandler(repository: LinksRepository)` from `redirect.ts`; `createSupabaseLinksRepository(url, serviceRoleKey): LinksRepository` from `supabaseLinksRepository.ts`. `index.ts` wires these together behind `GET /r/:slug`.

- [ ] **Step 1: Write the failing redirect handler tests**

`src/worker/redirect.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeRedirectHandler } from './redirect'
import type { LinksRepository } from './linksRepository'

function appWithRepository(repository: LinksRepository) {
  const app = new Hono()
  app.get('/r/:slug', makeRedirectHandler(repository))
  return app
}

function fakeExecutionCtx(): ExecutionContext {
  return { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext
}

describe('GET /r/:slug', () => {
  it('redirects to the destination URL for an active link', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue({
        id: 1,
        storeId: 10,
        employeeId: 100,
        destinationId: 1000,
        targetUrl: 'https://maps.google.com/example',
      }),
      recordClick: vi.fn().mockResolvedValue(undefined),
    }
    const app = appWithRepository(repository)

    const res = await app.request('/r/abc123', undefined, {}, fakeExecutionCtx())

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://maps.google.com/example')
    expect(repository.findActiveLinkBySlug).toHaveBeenCalledWith('abc123')
  })

  it('serves a fallback page for an unknown or inactive slug, without recording a click', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue(null),
      recordClick: vi.fn(),
    }
    const app = appWithRepository(repository)

    const res = await app.request('/r/does-not-exist', undefined, {}, fakeExecutionCtx())

    expect(res.status).toBe(404)
    expect(await res.text()).toContain('ลิงก์นี้ไม่พร้อมใช้งานแล้ว')
    expect(repository.recordClick).not.toHaveBeenCalled()
  })

  it('still redirects even if recording the click fails', async () => {
    const repository: LinksRepository = {
      findActiveLinkBySlug: vi.fn().mockResolvedValue({
        id: 1,
        storeId: 10,
        employeeId: 100,
        destinationId: 1000,
        targetUrl: 'https://maps.google.com/example',
      }),
      recordClick: vi.fn().mockRejectedValue(new Error('insert failed')),
    }
    const app = appWithRepository(repository)

    const res = await app.request('/r/abc123', undefined, {}, fakeExecutionCtx())

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://maps.google.com/example')
  })
})
```

Run: `npx vitest run src/worker/redirect.test.ts`
Expected: FAIL (`./redirect` and `./linksRepository` don't exist yet).

- [ ] **Step 2: Write `env.ts` and `linksRepository.ts`**

`src/worker/env.ts`:
```ts
export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}
```

`src/worker/linksRepository.ts`:
```ts
export interface LinkLookup {
  id: number
  storeId: number
  employeeId: number
  destinationId: number
  targetUrl: string
}

export interface RecordClickInput {
  linkId: number
  employeeId: number
  destinationId: number
  storeId: number
  ipAddress: string | null
  userAgent: string | null
  referrer: string | null
}

export interface LinksRepository {
  findActiveLinkBySlug(slug: string): Promise<LinkLookup | null>
  recordClick(input: RecordClickInput): Promise<void>
}
```

- [ ] **Step 3: Write `redirect.ts`**

```ts
import type { Context } from 'hono'
import type { LinksRepository } from './linksRepository'

const FALLBACK_HTML = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><title>ลิงก์นี้ไม่พร้อมใช้งาน</title></head>
<body style="font-family: system-ui, sans-serif; text-align:center; padding: 4rem 1rem; color:#4a3f55; background:#fffaf3;">
<h1>ลิงก์นี้ไม่พร้อมใช้งานแล้ว</h1>
<p>ลิงก์นี้อาจถูกปิดใช้งาน หรือไม่มีอยู่จริง กรุณาติดต่อร้านค้าโดยตรง</p>
</body></html>`

export function makeRedirectHandler(repository: LinksRepository) {
  return async function redirectHandler(c: Context) {
    const slug = c.req.param('slug')
    const link = await repository.findActiveLinkBySlug(slug)

    if (!link) {
      return c.html(FALLBACK_HTML, 404)
    }

    c.executionCtx.waitUntil(
      repository
        .recordClick({
          linkId: link.id,
          employeeId: link.employeeId,
          destinationId: link.destinationId,
          storeId: link.storeId,
          ipAddress: c.req.header('cf-connecting-ip') ?? null,
          userAgent: c.req.header('user-agent') ?? null,
          referrer: c.req.header('referer') ?? null,
        })
        .catch((err) => console.error('click insert failed', err))
    )

    return c.redirect(link.targetUrl, 302)
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/worker/redirect.test.ts`
Expected: PASS

- [ ] **Step 5: Write the real Supabase-backed repository**

`src/worker/supabaseLinksRepository.ts`:
```ts
import { createClient } from '@supabase/supabase-js'
import type { LinksRepository, LinkLookup, RecordClickInput } from './linksRepository'

export function createSupabaseLinksRepository(url: string, serviceRoleKey: string): LinksRepository {
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } })

  return {
    async findActiveLinkBySlug(slug: string): Promise<LinkLookup | null> {
      const { data, error } = await supabase
        .from('links')
        .select(
          `id, active, store_id,
           employee:employees!inner(id, active),
           destination:destinations!inner(id, active, target_url)`
        )
        .eq('slug', slug)
        .maybeSingle()

      if (error || !data) return null
      if (!data.active || !data.employee.active || !data.destination.active) return null

      return {
        id: data.id,
        storeId: data.store_id,
        employeeId: data.employee.id,
        destinationId: data.destination.id,
        targetUrl: data.destination.target_url,
      }
    },

    async recordClick(input: RecordClickInput): Promise<void> {
      const { error } = await supabase.from('clicks').insert({
        link_id: input.linkId,
        employee_id: input.employeeId,
        destination_id: input.destinationId,
        store_id: input.storeId,
        ip_address: input.ipAddress,
        user_agent: input.userAgent,
        referrer: input.referrer,
      })
      if (error) throw error
    },
  }
}
```

- [ ] **Step 6: Wire the route into `src/worker/index.ts`**

```ts
import { Hono } from 'hono'
import type { Env } from './env'
import { makeRedirectHandler } from './redirect'
import { createSupabaseLinksRepository } from './supabaseLinksRepository'

const app = new Hono<{ Bindings: Env }>()

app.get('/health', (c) => c.json({ status: 'ok' }))

app.get('/r/:slug', (c) => {
  const repository = createSupabaseLinksRepository(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  return makeRedirectHandler(repository)(c)
})

export default app
```

- [ ] **Step 7: Run the full worker test suite**

Run: `npx vitest run src/worker`
Expected: PASS (both `health.test.ts` and `redirect.test.ts`)

- [ ] **Step 8: Commit**

```bash
git add src/worker/env.ts src/worker/linksRepository.ts src/worker/supabaseLinksRepository.ts \
  src/worker/redirect.ts src/worker/redirect.test.ts src/worker/index.ts
git commit -m "feat(worker): implement GET /r/:slug redirect + click logging"
```

---

### Task 7: Supabase browser client & authentication

**Files:**
- Create: `src/web/lib/supabaseClient.ts`, `src/web/auth/AuthProvider.tsx`, `src/web/auth/RequireAuth.tsx`, `src/web/auth/LoginPage.tsx`, `src/web/auth/LoginPage.css`
- Test: `src/web/auth/LoginPage.test.tsx`

**Interfaces:**
- Produces: `supabase` client from `lib/supabaseClient.ts` (used by every subsequent frontend task); `AuthProvider`/`useAuth()` from `auth/AuthProvider.tsx`; `RequireAuth` route guard from `auth/RequireAuth.tsx`; `LoginPage` component.

- [ ] **Step 1: Write `supabaseClient.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set')
}

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 2: Write the failing `LoginPage` tests**

`src/web/auth/LoginPage.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage } from './LoginPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn() } },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signInWithPassword).mockReset()
    vi.mocked(supabase.auth.signUp).mockReset()
  })

  it('signs in with the entered credentials', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never)

    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'owner@example.com',
        password: 'secret123',
      })
    )
  })

  it('shows an error message when sign-in fails', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    } as never)

    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'เข้าสู่ระบบ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('toggles to sign-up mode and calls signUp', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never)

    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'ยังไม่มีบัญชี? สมัครสมาชิก' }))
    fireEvent.change(screen.getByLabelText('อีเมล'), { target: { value: 'new-owner@example.com' } })
    fireEvent.change(screen.getByLabelText('รหัสผ่าน'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }))

    await waitFor(() =>
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new-owner@example.com',
        password: 'secret123',
      })
    )
  })
})
```

Run: `npx vitest run src/web/auth/LoginPage.test.tsx`
Expected: FAIL (`./LoginPage` doesn't exist).

- [ ] **Step 3: Write `LoginPage.tsx` and `LoginPage.css`**

`src/web/auth/LoginPage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import './LoginPage.css'

type Mode = 'sign-in' | 'sign-up'

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setInfo(null)

    if (mode === 'sign-in') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) setError(signUpError.message)
      else setInfo('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน (ถ้าจำเป็น) แล้วเข้าสู่ระบบ')
    }

    setSubmitting(false)
  }

  return (
    <div className="login-page">
      <form className="card login-page__form" onSubmit={handleSubmit}>
        <h1>{mode === 'sign-in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</h1>
        <label>
          อีเมล
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          รหัสผ่าน
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && (
          <p role="alert" className="login-page__error">
            {error}
          </p>
        )}
        {info && <p role="status">{info}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'กำลังดำเนินการ...' : mode === 'sign-in' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
        </button>
        <button
          type="button"
          className="login-page__toggle"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        >
          {mode === 'sign-in' ? 'ยังไม่มีบัญชี? สมัครสมาชิก' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  )
}
```

`src/web/auth/LoginPage.css`:
```css
.login-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--sp-4);
}
.login-page__form {
  display: grid;
  gap: var(--sp-3);
  width: min(360px, 100%);
}
.login-page__form label {
  display: grid;
  gap: var(--sp-2);
  font-size: 0.9rem;
}
.login-page__form input {
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md);
  border: 1px solid var(--c-ink-soft);
}
.login-page__error {
  color: var(--c-error);
}
.login-page__toggle {
  background: none;
  border: none;
  color: var(--c-accent-deep);
  cursor: pointer;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/web/auth/LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Write `AuthProvider.tsx` and `RequireAuth.tsx`**

`src/web/auth/AuthProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthContextValue {
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
```

`src/web/auth/RequireAuth.tsx`:
```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <p>กำลังโหลด...</p>
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
```

These two files have no dedicated unit test — they are thin composition of `supabase.auth` (already covered by `LoginPage.test.tsx`'s mocked module) and `react-router-dom`, and are exercised end-to-end in Task 15's manual smoke test.

- [ ] **Step 6: Commit**

```bash
git add src/web/lib/supabaseClient.ts src/web/auth
git commit -m "feat(web): add Supabase auth (sign-in/sign-up) and route guard"
```

---

### Task 8: Onboarding, dashboard shell, and base theme tokens

**Files:**
- Create: `src/web/store/useStore.ts`, `src/web/store/CreateStorePage.tsx`
- Create: `src/web/layout/DashboardLayout.tsx`
- Create: `src/web/theme/tokens.css`, `src/web/theme/base.css`
- Create: `src/web/App.tsx`, `src/web/main.tsx`

**Interfaces:**
- Consumes: `AuthProvider`/`useAuth()`, `RequireAuth` (Task 7); `supabase` client (Task 7).
- Produces: `useStore()` hook returning `{ store, loading, setStore }` — consumed by Tasks 9–13 (each screen takes `storeId: number` as a prop, obtained from `store.id` here); the base CSS custom properties (`--c-*`, `--sp-*`, `--r-*`, `--shadow-soft`, `--chart-*`) that every later component's CSS references.

- [ ] **Step 1: Write the theme tokens**

`src/web/theme/tokens.css` (a literal, minimal port of `/Users/coke/Projects/qr-code`'s validated tokens, per spec §8, plus the dataviz sequential-blue chart tokens per spec §8/dataviz skill — Task 14 refines these, this is the functional starting point):
```css
:root {
  --c-blush: #ffe5ec;
  --c-mint: #c9f2e9;
  --c-lavender: #e5deff;
  --c-cream: #fffaf3;
  --c-ink: #4a3f55;
  --c-ink-soft: #8a7f95;
  --c-accent: #ff8fab;
  --c-accent-deep: #f26d92;
  --c-surface: #ffffff;
  --c-warn: #d97706;
  --c-error: #d64550;

  --bg-page: linear-gradient(160deg, var(--c-blush) 0%, var(--c-lavender) 55%, var(--c-mint) 100%);

  --r-md: 18px;
  --r-lg: 28px;
  --r-pill: 999px;

  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-5: 1.5rem;
  --sp-6: 2rem;

  --shadow-soft: 0 10px 30px -12px rgba(255, 143, 171, 0.45);
  --font-body: 'Nunito', 'Mitr', sans-serif;

  --motion-fast: 140ms;
  --motion-base: 240ms;
  --ease-soft: cubic-bezier(0.34, 1.2, 0.64, 1);

  /* dataviz — kept distinct from the pastel chrome above, per spec §8 */
  --chart-surface: #fcfcfb;
  --chart-ink-primary: #0b0b0b;
  --chart-ink-secondary: #52514e;
  --chart-ink-muted: #898781;
  --chart-gridline: #e1e0d9;
  --chart-baseline: #c3c2b7;
  --chart-series-1: #2a78d6;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 0ms;
    --motion-base: 0ms;
  }
}
```

`src/web/theme/base.css`:
```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100dvh;
  background: var(--bg-page);
  background-attachment: fixed;
  color: var(--c-ink);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

.card {
  background: var(--c-surface);
  border-radius: var(--r-lg);
  padding: var(--sp-5);
  box-shadow: var(--shadow-soft);
}

button {
  border-radius: var(--r-pill);
  border: none;
  padding: var(--sp-2) var(--sp-4);
  background: var(--c-accent);
  color: white;
  cursor: pointer;
  font-family: inherit;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Write `useStore.ts` and `CreateStorePage.tsx`**

`src/web/store/useStore.ts`:
```ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Store {
  id: number
  name: string
  owner_user_id: string
}

export function useStore() {
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('stores')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setStore(data as Store | null)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { store, loading, setStore }
}
```

`src/web/store/CreateStorePage.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Store } from './useStore'

export function CreateStorePage({ onCreated }: { onCreated: (store: Store) => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { data: userData } = await supabase.auth.getUser()
    const { data, error: insertError } = await supabase
      .from('stores')
      .insert({ name, owner_user_id: userData.user!.id })
      .select()
      .single()
    setSubmitting(false)
    if (insertError || !data) {
      setError(insertError?.message ?? 'ไม่สามารถสร้างร้านค้าได้')
      return
    }
    onCreated(data as Store)
  }

  return (
    <div className="login-page">
      <form className="card login-page__form" onSubmit={handleSubmit}>
        <h1>สร้างร้านค้าของคุณ</h1>
        <label>
          ชื่อร้าน
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'กำลังสร้าง...' : 'สร้างร้านค้า'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Write `DashboardLayout.tsx`**

```tsx
import { NavLink, Outlet } from 'react-router-dom'

export function DashboardLayout() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>PAMM Map KPI</h1>
      </header>
      <nav className="app__nav">
        <NavLink to="/" end>
          ภาพรวม KPI
        </NavLink>
        <NavLink to="/destinations">ปลายทาง</NavLink>
        <NavLink to="/employees">พนักงาน</NavLink>
        <NavLink to="/links">ลิงก์</NavLink>
      </nav>
      <main className="app__content">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Write `App.tsx` and `main.tsx`**

These reference `DestinationsPage`, `EmployeesPage`, `LinksPage`, `KpiDashboardPage` from Tasks 9–13. Create stub placeholder-free versions is not possible per the plan's no-placeholder rule, so this step is deferred: write `App.tsx`'s routing shell now with only the routes this task's components support (`/login`, and a bare "store created" confirmation in place of the dashboard body), and Task 13 extends `App.tsx` with the remaining four routes once those pages exist.

`src/web/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './auth/LoginPage'
import { useStore } from './store/useStore'
import { CreateStorePage } from './store/CreateStorePage'
import { DashboardLayout } from './layout/DashboardLayout'

function StoreArea() {
  const { store, loading, setStore } = useStore()
  if (loading) return <p>กำลังโหลด...</p>
  if (!store) return <CreateStorePage onCreated={setStore} />
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<p>ยินดีต้อนรับสู่ {store.name}</p>} />
      </Route>
    </Routes>
  )
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <p>กำลังโหลด...</p>
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/*" element={<StoreArea />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
```

`src/web/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './theme/tokens.css'
import './theme/base.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 5: Verify the app builds and runs**

Run: `npm run typecheck && npm run build`
Expected: no errors.

Run: `npx supabase start` (if not already running) and `npm run dev`, then in a browser sign up a test owner and confirm the "create your store" form appears, and after submitting shows "ยินดีต้อนรับสู่ <store name>".

- [ ] **Step 6: Commit**

```bash
git add src/web/store src/web/layout src/web/theme src/web/App.tsx src/web/main.tsx
git commit -m "feat(web): onboarding, dashboard shell, and base theme tokens"
```

---

### Task 9: Shared collection hook & Destinations screen

**Files:**
- Create: `src/web/lib/useCollection.ts`
- Create: `src/web/destinations/DestinationsPage.tsx`
- Test: `src/web/destinations/DestinationsPage.test.tsx`

**Interfaces:**
- Consumes: `supabase` client (Task 7).
- Produces: `useCollection<T>(table: string, storeId: number)` returning `{ rows: T[], loading, error, insert(values), update(id, values), reload() }` — reused as-is by `EmployeesPage` in Task 10.

- [ ] **Step 1: Write `useCollection.ts`**

```ts
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export interface CollectionRow {
  id: number
  active: boolean
}

export function useCollection<T extends CollectionRow>(table: string, storeId: number) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error: selectError } = await supabase
      .from(table)
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })
    if (selectError) setError(selectError.message)
    else setRows((data ?? []) as T[])
    setLoading(false)
  }, [table, storeId])

  useEffect(() => {
    reload()
  }, [reload])

  const insert = useCallback(
    async (values: Record<string, unknown>) => {
      const { error: insertError } = await supabase.from(table).insert({ ...values, store_id: storeId })
      if (insertError) throw insertError
      await reload()
    },
    [table, storeId, reload]
  )

  const update = useCallback(
    async (id: number, values: Record<string, unknown>) => {
      const { error: updateError } = await supabase.from(table).update(values).eq('id', id)
      if (updateError) throw updateError
      await reload()
    },
    [table, reload]
  )

  return { rows, loading, error, insert, update, reload }
}
```

- [ ] **Step 2: Write the failing `DestinationsPage` tests**

`src/web/destinations/DestinationsPage.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DestinationsPage } from './DestinationsPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

function mockFrom() {
  const insertResult = Promise.resolve({ data: null, error: null })
  const updateEq = vi.fn(() => insertResult)
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() =>
      Promise.resolve({
        data: [
          { id: 1, store_id: 10, label: 'Google Maps', target_url: 'https://maps.google.com/x', active: true },
        ],
        error: null,
      })
    ),
    insert: vi.fn(() => insertResult),
    update: vi.fn(() => ({ eq: updateEq })),
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

describe('DestinationsPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('lists existing destinations', async () => {
    mockFrom()
    render(<DestinationsPage storeId={10} />)
    expect(await screen.findByText('Google Maps')).toBeInTheDocument()
  })

  it('submits a new destination', async () => {
    const builder = mockFrom()
    render(<DestinationsPage storeId={10} />)
    await waitFor(() => expect(builder.order).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('ชื่อปลายทาง'), { target: { value: 'TikTok' } })
    fireEvent.change(screen.getByLabelText('URL ปลายทาง'), { target: { value: 'https://tiktok.com/x' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มปลายทาง' }))

    await waitFor(() =>
      expect(builder.insert).toHaveBeenCalledWith({
        label: 'TikTok',
        target_url: 'https://tiktok.com/x',
        store_id: 10,
      })
    )
  })

  it('toggles a destination active/inactive', async () => {
    const builder = mockFrom()
    render(<DestinationsPage storeId={10} />)
    const toggle = await screen.findByRole('button', { name: 'ปิดใช้งาน' })
    fireEvent.click(toggle)

    await waitFor(() => expect(builder.update).toHaveBeenCalledWith({ active: false }))
  })
})
```

Run: `npx vitest run src/web/destinations/DestinationsPage.test.tsx`
Expected: FAIL (`./DestinationsPage` doesn't exist).

- [ ] **Step 3: Write `DestinationsPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useCollection } from '../lib/useCollection'

interface Destination {
  id: number
  store_id: number
  label: string
  target_url: string
  active: boolean
}

export function DestinationsPage({ storeId }: { storeId: number }) {
  const { rows, loading, error, insert, update } = useCollection<Destination>('destinations', storeId)
  const [label, setLabel] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await insert({ label, target_url: targetUrl })
      setLabel('')
      setTargetUrl('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เพิ่มปลายทางไม่สำเร็จ')
    }
  }

  return (
    <section>
      <h2>ปลายทาง (Destinations)</h2>
      <form className="card" onSubmit={handleAdd}>
        <label>
          ชื่อปลายทาง
          <input value={label} onChange={(e) => setLabel(e.target.value)} required />
        </label>
        <label>
          URL ปลายทาง
          <input type="url" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} required />
        </label>
        {formError && <p role="alert">{formError}</p>}
        <button type="submit">เพิ่มปลายทาง</button>
      </form>

      {loading && <p>กำลังโหลด...</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((d) => (
          <li key={d.id}>
            <span>{d.label}</span> — <span>{d.target_url}</span>{' '}
            <button onClick={() => update(d.id, { active: !d.active })}>
              {d.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/web/destinations/DestinationsPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/web/lib/useCollection.ts src/web/destinations
git commit -m "feat(web): add Destinations screen with shared collection hook"
```

---

### Task 10: Employees screen

**Files:**
- Create: `src/web/employees/EmployeesPage.tsx`
- Test: `src/web/employees/EmployeesPage.test.tsx`

**Interfaces:**
- Consumes: `useCollection<T>` (Task 9).

- [ ] **Step 1: Write the failing `EmployeesPage` tests**

`src/web/employees/EmployeesPage.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmployeesPage } from './EmployeesPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

function mockFrom() {
  const insertResult = Promise.resolve({ data: null, error: null })
  const updateEq = vi.fn(() => insertResult)
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() =>
      Promise.resolve({ data: [{ id: 1, store_id: 10, name: 'Somchai', active: true }], error: null })
    ),
    insert: vi.fn(() => insertResult),
    update: vi.fn(() => ({ eq: updateEq })),
  }
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
  })

  it('lists existing employees', async () => {
    mockFrom()
    render(<EmployeesPage storeId={10} />)
    expect(await screen.findByText('Somchai')).toBeInTheDocument()
  })

  it('submits a new employee', async () => {
    const builder = mockFrom()
    render(<EmployeesPage storeId={10} />)
    await waitFor(() => expect(builder.order).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('ชื่อพนักงาน'), { target: { value: 'Nok' } })
    fireEvent.click(screen.getByRole('button', { name: 'เพิ่มพนักงาน' }))

    await waitFor(() => expect(builder.insert).toHaveBeenCalledWith({ name: 'Nok', store_id: 10 }))
  })
})
```

Run: `npx vitest run src/web/employees/EmployeesPage.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Write `EmployeesPage.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useCollection } from '../lib/useCollection'

interface Employee {
  id: number
  store_id: number
  name: string
  active: boolean
}

export function EmployeesPage({ storeId }: { storeId: number }) {
  const { rows, loading, error, insert, update } = useCollection<Employee>('employees', storeId)
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await insert({ name })
      setName('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'เพิ่มพนักงานไม่สำเร็จ')
    }
  }

  return (
    <section>
      <h2>พนักงาน (Employees)</h2>
      <form className="card" onSubmit={handleAdd}>
        <label>
          ชื่อพนักงาน
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {formError && <p role="alert">{formError}</p>}
        <button type="submit">เพิ่มพนักงาน</button>
      </form>

      {loading && <p>กำลังโหลด...</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {rows.map((emp) => (
          <li key={emp.id}>
            <span>{emp.name}</span>{' '}
            <button onClick={() => update(emp.id, { active: !emp.active })}>
              {emp.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Run the tests to verify they pass**

Run: `npx vitest run src/web/employees/EmployeesPage.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/web/employees
git commit -m "feat(web): add Employees screen"
```

---

### Task 11: Links (read-only) screen

**Files:**
- Create: `src/web/links/LinksPage.tsx`
- Test: `src/web/links/LinksPage.test.tsx`

**Interfaces:**
- Consumes: `supabase` client (Task 7).

- [ ] **Step 1: Write the failing `LinksPage` test**

`src/web/links/LinksPage.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LinksPage } from './LinksPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

describe('LinksPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('renders each link with employee, destination, and a copy button', async () => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() =>
        Promise.resolve({
          data: [
            {
              id: 1,
              slug: 'abc123',
              active: true,
              employees: { name: 'Somchai' },
              destinations: { label: 'Google Maps' },
            },
          ],
          error: null,
        })
      ),
    }
    vi.mocked(supabase.from).mockReturnValue(builder as never)

    render(<LinksPage storeId={10} />)

    expect(await screen.findByText('Somchai')).toBeInTheDocument()
    expect(screen.getByText('Google Maps')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'คัดลอกลิงก์' }))

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/r/abc123`)
    )
  })
})
```

Run: `npx vitest run src/web/links/LinksPage.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Write `LinksPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface LinkRow {
  id: number
  slug: string
  active: boolean
  employees: { name: string } | null
  destinations: { label: string } | null
}

export function LinksPage({ storeId }: { storeId: number }) {
  const [rows, setRows] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    supabase
      .from('links')
      .select('id, slug, active, employees(name), destinations(label)')
      .eq('store_id', storeId)
      .order('id', { ascending: true })
      .then(({ data }) => {
        setRows((data ?? []) as unknown as LinkRow[])
        setLoading(false)
      })
  }, [storeId])

  async function handleCopy(link: LinkRow) {
    const url = `${window.location.origin}/r/${link.slug}`
    await navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId((current) => (current === link.id ? null : current)), 2000)
  }

  if (loading) return <p>กำลังโหลด...</p>

  return (
    <section>
      <h2>ลิงก์ (Links)</h2>
      <table>
        <thead>
          <tr>
            <th>พนักงาน</th>
            <th>ปลายทาง</th>
            <th>สถานะ</th>
            <th>ลิงก์</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((link) => (
            <tr key={link.id}>
              <td>{link.employees?.name}</td>
              <td>{link.destinations?.label}</td>
              <td>{link.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</td>
              <td>
                <button onClick={() => handleCopy(link)}>
                  {copiedId === link.id ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `npx vitest run src/web/links/LinksPage.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/web/links
git commit -m "feat(web): add read-only Links screen with copy-to-clipboard"
```

---

### Task 12: KPI dashboard — filters & Leaderboard

**Files:**
- Create: `src/web/kpi/dateRangePresets.ts`, `src/web/kpi/Leaderboard.tsx`, `src/web/kpi/Leaderboard.css`
- Create: `src/web/kpi/KpiDashboardPage.tsx`
- Test: `src/web/kpi/KpiDashboardPage.test.tsx`

**Interfaces:**
- Consumes: `supabase` client (Task 7), `get_leaderboard` RPC (Task 5).
- Produces: `KpiDashboardPage` — Task 13 extends this same file to add the trend chart and CSV export.

- [ ] **Step 1: Write `dateRangePresets.ts` and `Leaderboard.tsx`**

`src/web/kpi/dateRangePresets.ts`:
```ts
export function lastNDaysRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}
```

`src/web/kpi/Leaderboard.tsx`:
```tsx
import './Leaderboard.css'

export interface LeaderboardRow {
  employee_id: number
  employee_name: string
  click_count: number
}

export function Leaderboard({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) return <p>ยังไม่มีข้อมูลในช่วงเวลานี้</p>

  const max = Math.max(...rows.map((r) => r.click_count), 1)

  return (
    <ol className="leaderboard">
      {rows.map((row, index) => (
        <li key={row.employee_id} className="leaderboard__row">
          <span className="leaderboard__rank">#{index + 1}</span>
          <span className="leaderboard__name">{row.employee_name}</span>
          <span className="leaderboard__bar" style={{ width: `${(row.click_count / max) * 100}%` }} />
          <span className="leaderboard__count">{row.click_count}</span>
        </li>
      ))}
    </ol>
  )
}
```

`src/web/kpi/Leaderboard.css`:
```css
.leaderboard {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--sp-2);
}
.leaderboard__row {
  display: grid;
  grid-template-columns: 2.5rem 1fr auto;
  align-items: center;
  gap: var(--sp-2);
}
.leaderboard__bar {
  grid-column: 1 / -1;
  height: 8px;
  border-radius: var(--r-pill);
  background: var(--chart-series-1);
}
```

- [ ] **Step 2: Write the failing `KpiDashboardPage` test**

`src/web/kpi/KpiDashboardPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KpiDashboardPage } from './KpiDashboardPage'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))

describe('KpiDashboardPage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset()
    vi.mocked(supabase.rpc).mockReset()

    const destinationsBuilder = {
      select: vi.fn(() => destinationsBuilder),
      eq: vi.fn(() => Promise.resolve({ data: [{ id: 1, label: 'Google Maps' }], error: null })),
    }
    vi.mocked(supabase.from).mockReturnValue(destinationsBuilder as never)

    vi.mocked(supabase.rpc).mockImplementation((fnName: string) => {
      if (fnName === 'get_leaderboard') {
        return Promise.resolve({
          data: [
            { employee_id: 1, employee_name: 'Somchai', click_count: 5 },
            { employee_id: 2, employee_name: 'Nok', click_count: 2 },
          ],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: [], error: null }) as never
    })
  })

  it('renders the leaderboard ranked by click count', async () => {
    render(<KpiDashboardPage storeId={10} />)

    expect(await screen.findByText('Somchai')).toBeInTheDocument()
    expect(screen.getByText('Nok')).toBeInTheDocument()
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_leaderboard',
      expect.objectContaining({ p_destination_id: null })
    )
  })
})
```

Run: `npx vitest run src/web/kpi/KpiDashboardPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `KpiDashboardPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Leaderboard, type LeaderboardRow } from './Leaderboard'
import { lastNDaysRange } from './dateRangePresets'

interface Destination {
  id: number
  label: string
}

export function KpiDashboardPage({ storeId }: { storeId: number }) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [range, setRange] = useState(() => lastNDaysRange(30))
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('destinations')
      .select('id, label')
      .eq('store_id', storeId)
      .then(({ data }) => setDestinations((data ?? []) as Destination[]))
  }, [storeId])

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_leaderboard', { p_from: range.from, p_to: range.to, p_destination_id: destinationId })
      .then(({ data }) => {
        setLeaderboard((data ?? []) as LeaderboardRow[])
        setLoading(false)
      })
  }, [range, destinationId])

  return (
    <section>
      <h2>ภาพรวม KPI</h2>
      <div className="kpi-filters">
        <label>
          ช่วงเวลา
          <select onChange={(e) => setRange(lastNDaysRange(Number(e.target.value)))} defaultValue={30}>
            <option value={7}>7 วันล่าสุด</option>
            <option value={30}>30 วันล่าสุด</option>
            <option value={90}>90 วันล่าสุด</option>
          </select>
        </label>
        <label>
          ปลายทาง
          <select
            onChange={(e) => setDestinationId(e.target.value ? Number(e.target.value) : null)}
            defaultValue=""
          >
            <option value="">ทั้งหมด</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <p>กำลังโหลด...</p> : <Leaderboard rows={leaderboard} />}
    </section>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/web/kpi/KpiDashboardPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/web/kpi/dateRangePresets.ts src/web/kpi/Leaderboard.tsx src/web/kpi/Leaderboard.css \
  src/web/kpi/KpiDashboardPage.tsx src/web/kpi/KpiDashboardPage.test.tsx
git commit -m "feat(web): add KPI dashboard filters and leaderboard"
```

---

### Task 13: KPI dashboard — trend chart, CSV export, and full routing

**Files:**
- Create: `src/web/kpi/TrendChart.tsx`, `src/web/kpi/TrendChart.css`
- Create: `src/web/lib/csv.ts`
- Test: `src/web/lib/csv.test.ts`
- Modify: `src/web/kpi/KpiDashboardPage.tsx`, `src/web/kpi/KpiDashboardPage.test.tsx`, `src/web/App.tsx`

**Interfaces:**
- Consumes: `get_click_trend` RPC (Task 5); `KpiDashboardPage` (Task 12); `DestinationsPage`, `EmployeesPage`, `LinksPage` (Tasks 9–11).
- Produces: `toCsv(rows)` / `downloadCsv(filename, csv)` from `lib/csv.ts`. `App.tsx`'s `StoreArea` now routes to all four screens, replacing Task 8's placeholder single route.

- [ ] **Step 1: Write the failing `csv.ts` tests**

`src/web/lib/csv.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('converts rows to a CSV string with a header row', () => {
    const csv = toCsv([
      { employee_name: 'Somchai', click_count: 5 },
      { employee_name: 'Nok', click_count: 2 },
    ])
    expect(csv).toBe('employee_name,click_count\nSomchai,5\nNok,2')
  })

  it('quotes values containing commas or quotes', () => {
    const csv = toCsv([{ employee_name: 'Somchai, "The Closer"', click_count: 5 }])
    expect(csv).toBe('employee_name,click_count\n"Somchai, ""The Closer""",5')
  })

  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })
})
```

Run: `npx vitest run src/web/lib/csv.test.ts`
Expected: FAIL.

- [ ] **Step 2: Write `csv.ts`**

```ts
export function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (value: string | number) => {
    const str = String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))]
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Run the CSV tests to verify they pass**

Run: `npx vitest run src/web/lib/csv.test.ts`
Expected: PASS

- [ ] **Step 4: Write `TrendChart.tsx` and `TrendChart.css`**

A single-series line chart, hand-rolled SVG per the dataviz skill's mark spec (2px line, rounded caps, baseline drawn in the muted chart-baseline token, series drawn in the sequential-blue chart-data token — never a chrome pastel):

```tsx
import './TrendChart.css'

export interface TrendPoint {
  bucket: string
  click_count: number
}

const WIDTH = 640
const HEIGHT = 200
const PADDING = 24

export function TrendChart({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return <p>ยังไม่มีข้อมูลในช่วงเวลานี้</p>

  const max = Math.max(...points.map((p) => p.click_count), 1)
  const stepX = points.length > 1 ? (WIDTH - PADDING * 2) / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = PADDING + i * stepX
    const y = HEIGHT - PADDING - (p.click_count / max) * (HEIGHT - PADDING * 2)
    return { x, y, point: p }
  })

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')

  return (
    <svg className="trend-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="แนวโน้มจำนวนคลิกตามเวลา">
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="var(--chart-baseline)"
        strokeWidth={1}
      />
      <path d={path} fill="none" stroke="var(--chart-series-1)" strokeWidth={2} strokeLinecap="round" />
      {coords.map((c) => (
        <circle key={c.point.bucket} cx={c.x} cy={c.y} r={4} fill="var(--chart-series-1)" />
      ))}
    </svg>
  )
}
```

`src/web/kpi/TrendChart.css`:
```css
.trend-chart {
  width: 100%;
  height: auto;
  background: var(--chart-surface);
  border-radius: var(--r-md);
}
```

- [ ] **Step 5: Extend the `KpiDashboardPage` test for the trend chart and export button**

Add to `src/web/kpi/KpiDashboardPage.test.tsx` (inside the existing `describe` block, alongside the Task 12 test):

```tsx
it('renders the trend chart and exports CSV on demand', async () => {
  vi.mocked(supabase.rpc).mockImplementation((fnName: string) => {
    if (fnName === 'get_leaderboard') {
      return Promise.resolve({
        data: [{ employee_id: 1, employee_name: 'Somchai', click_count: 5 }],
        error: null,
      }) as never
    }
    if (fnName === 'get_click_trend') {
      return Promise.resolve({
        data: [{ bucket: '2026-09-01T00:00:00Z', click_count: 5 }],
        error: null,
      }) as never
    }
    return Promise.resolve({ data: [], error: null }) as never
  })

  const clickSpy = vi.fn()
  const originalCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = originalCreateElement(tag)
    if (tag === 'a') el.click = clickSpy
    return el
  })
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()

  render(<KpiDashboardPage storeId={10} />)

  expect(await screen.findByRole('img', { name: 'แนวโน้มจำนวนคลิกตามเวลา' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'ส่งออก CSV' }))
  expect(clickSpy).toHaveBeenCalled()
})
```

Add the missing `fireEvent` import to the top of the test file: `import { render, screen, fireEvent } from '@testing-library/react'`.

Run: `npx vitest run src/web/kpi/KpiDashboardPage.test.tsx`
Expected: FAIL (new test fails — no trend chart or export button rendered yet).

- [ ] **Step 6: Extend `KpiDashboardPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Leaderboard, type LeaderboardRow } from './Leaderboard'
import { TrendChart, type TrendPoint } from './TrendChart'
import { lastNDaysRange } from './dateRangePresets'
import { toCsv, downloadCsv } from '../lib/csv'

interface Destination {
  id: number
  label: string
}

export function KpiDashboardPage({ storeId }: { storeId: number }) {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destinationId, setDestinationId] = useState<number | null>(null)
  const [range, setRange] = useState(() => lastNDaysRange(30))
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('destinations')
      .select('id, label')
      .eq('store_id', storeId)
      .then(({ data }) => setDestinations((data ?? []) as Destination[]))
  }, [storeId])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.rpc('get_leaderboard', { p_from: range.from, p_to: range.to, p_destination_id: destinationId }),
      supabase.rpc('get_click_trend', {
        p_from: range.from,
        p_to: range.to,
        p_destination_id: destinationId,
        p_granularity: 'day',
      }),
    ]).then(([leaderboardRes, trendRes]) => {
      setLeaderboard((leaderboardRes.data ?? []) as LeaderboardRow[])
      setTrend((trendRes.data ?? []) as TrendPoint[])
      setLoading(false)
    })
  }, [range, destinationId])

  function handleExport() {
    const csv = toCsv(leaderboard as unknown as Record<string, string | number>[])
    downloadCsv('kpi-leaderboard.csv', csv)
  }

  return (
    <section>
      <h2>ภาพรวม KPI</h2>
      <div className="kpi-filters">
        <label>
          ช่วงเวลา
          <select onChange={(e) => setRange(lastNDaysRange(Number(e.target.value)))} defaultValue={30}>
            <option value={7}>7 วันล่าสุด</option>
            <option value={30}>30 วันล่าสุด</option>
            <option value={90}>90 วันล่าสุด</option>
          </select>
        </label>
        <label>
          ปลายทาง
          <select
            onChange={(e) => setDestinationId(e.target.value ? Number(e.target.value) : null)}
            defaultValue=""
          >
            <option value="">ทั้งหมด</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleExport}>
          ส่งออก CSV
        </button>
      </div>

      {loading ? (
        <p>กำลังโหลด...</p>
      ) : (
        <>
          <TrendChart points={trend} />
          <Leaderboard rows={leaderboard} />
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 7: Run the KPI dashboard tests to verify they pass**

Run: `npx vitest run src/web/kpi/KpiDashboardPage.test.tsx`
Expected: PASS

- [ ] **Step 8: Wire the remaining routes into `App.tsx`**

Replace `StoreArea`'s single placeholder route in `src/web/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { LoginPage } from './auth/LoginPage'
import { useStore } from './store/useStore'
import { CreateStorePage } from './store/CreateStorePage'
import { DashboardLayout } from './layout/DashboardLayout'
import { DestinationsPage } from './destinations/DestinationsPage'
import { EmployeesPage } from './employees/EmployeesPage'
import { LinksPage } from './links/LinksPage'
import { KpiDashboardPage } from './kpi/KpiDashboardPage'

function StoreArea() {
  const { store, loading, setStore } = useStore()
  if (loading) return <p>กำลังโหลด...</p>
  if (!store) return <CreateStorePage onCreated={setStore} />
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<KpiDashboardPage storeId={store.id} />} />
        <Route path="destinations" element={<DestinationsPage storeId={store.id} />} />
        <Route path="employees" element={<EmployeesPage storeId={store.id} />} />
        <Route path="links" element={<LinksPage storeId={store.id} />} />
      </Route>
    </Routes>
  )
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <p>กำลังโหลด...</p>
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/*" element={<StoreArea />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
```

- [ ] **Step 9: Run the full test suite and typecheck**

Run: `npm run typecheck && npx vitest run`
Expected: all tests PASS, no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/web/kpi/TrendChart.tsx src/web/kpi/TrendChart.css src/web/lib/csv.ts \
  src/web/lib/csv.test.ts src/web/kpi/KpiDashboardPage.tsx src/web/kpi/KpiDashboardPage.test.tsx \
  src/web/App.tsx
git commit -m "feat(web): add trend chart, CSV export, and wire up full dashboard routing"
```

---

### Task 14: Visual polish pass (impeccable)

**Files:**
- Modify: any file under `src/web/**` that the `impeccable:impeccable` skill's own process touches (component markup, CSS, `theme/tokens.css`, `theme/base.css`).

**Interfaces:**
- Consumes: every screen built in Tasks 7–13. This task changes appearance only — no component prop, hook signature, table/column name, or RPC contract from earlier tasks may change. If the skill's process suggests a prop/data change, stop and flag it rather than making it silently.

- [ ] **Step 1: Start the local stack**

Run: `npx supabase start` (if not already running) and `npm run dev` in a separate terminal, so changes can be checked live in the browser.

- [ ] **Step 2: Invoke the `impeccable:impeccable` skill**

Brief to give the skill (this is the actual brief to pass, not a placeholder — it is spec §8 condensed to what the skill needs):

> Polish the PAMM Map KPI owner dashboard (Login/sign-up, create-store onboarding, Destinations, Employees, Links, and the KPI dashboard with leaderboard + trend chart). Visual anchor: `/Users/coke/Projects/qr-code` — minimal, kawaii-leaning pastel design (blush/mint/lavender/cream, ink-purple text, coral-pink accent, large radii, tinted shadows, rounded friendly type). Adapt it into this product's own identity rather than reusing it verbatim. This is a KPI/analytics dashboard, not a single-purpose tool: keep the pastel/kawaii language for chrome (cards, buttons, backgrounds, empty states, nav) but do not touch the chart data colors in `theme/tokens.css` (`--chart-*`) or the inline `var(--chart-series-1)` references in `Leaderboard.tsx`/`TrendChart.tsx` — those are validated separately against the dataviz skill and must stay distinct from decorative chrome. A small mascot/character motif is optional, at your discretion, for empty states or onboarding.

- [ ] **Step 3: Manually verify every screen after the skill's changes**

Walk through in the browser: `/login` (both sign-in and sign-up modes), the create-store form, `/` (KPI dashboard with leaderboard + trend chart), `/destinations`, `/employees`, `/links` (copy button). Confirm nothing looks broken or unreadable, and that chart bars/lines are still visibly distinct from the page background.

- [ ] **Step 4: Run the full test suite**

Run: `npm run typecheck && npx vitest run`
Expected: all tests still PASS — a pure visual pass must not change any component's behavior or data contracts.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "style(web): visual polish pass via impeccable, kawaii-pastel direction"
```

---

### Task 15: Local end-to-end smoke test & deployment secrets checklist

**Files:** none (verification only; commit only if this step surfaces a bug that needs a fix).

**Interfaces:**
- Consumes: the entire system built in Tasks 1–14.

- [ ] **Step 1: Reset the local database and start both servers**

Run: `npx supabase db reset` (re-applies every migration from a clean slate) and `npx supabase start`, then `npm run dev`.

- [ ] **Step 2: Walk the full golden path in the browser**

1. Go to `/login`, switch to sign-up mode, create an owner account (`owner@example.com` / any password ≥ 6 chars).
2. On first login, the "create your store" form appears — create a store named "ร้านทดสอบ".
3. Go to **ปลายทาง**, add a destination: label "Google Maps", URL `https://maps.google.com/?cid=12345`.
4. Go to **พนักงาน**, add an employee: "สมชาย".
5. Go to **ลิงก์** — confirm exactly one row exists (สมชาย × Google Maps) and its "คัดลอกลิงก์" button copies a URL of the form `http://localhost:5173/r/<slug>` (or whatever `vite dev` prints as the local origin).
6. Open that copied URL directly in the browser (or `curl -I <url>`). Confirm it responds with a `302` and a `Location` header pointing at `https://maps.google.com/?cid=12345`.
7. In Supabase Studio (`npx supabase status` prints its local URL) or via `select * from clicks;` in `npx supabase db psql`, confirm exactly one row was inserted with the correct `employee_id`, `destination_id`, and `store_id`.
8. Back in the dashboard, go to **ภาพรวม KPI** — confirm the leaderboard shows "สมชาย" with 1 click, and the trend chart renders a single data point.
9. Add a second destination ("Facebook", any URL) and confirm **ลิงก์** now shows two rows for สมชาย without any manual action.
10. Deactivate the "Google Maps" destination and confirm its row in **ลิงก์** flips to "ปิดใช้งาน", and re-visiting the earlier copied `/r/<slug>` URL now shows the Thai fallback page instead of redirecting.

If any step fails, treat it as a bug in the relevant earlier task: fix it there (write/adjust a failing test first if the gap wasn't already covered), re-run that task's tests, then resume this checklist from step 1.

- [ ] **Step 3: Document the production secrets checklist**

This is a checklist for whoever deploys, not a file to create. Before running `npm run deploy`:

1. Create a Supabase project (not the local stack) and run `npx supabase link --project-ref <ref>` then `npx supabase db push` to apply all four migrations to it.
2. `npx wrangler secret put SUPABASE_URL` — paste the project's API URL.
3. `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` — paste the project's `service_role` key (Project Settings → API). Never put this in `.env`, source control, or any `VITE_`-prefixed variable.
4. Create a real `.env` locally (or in the CI build step) from `.env.example`, filled with the project's URL and `anon` key — these are safe to bundle client-side per spec §12.
5. Confirm `wrangler.jsonc`'s `assets.directory` (`./dist/client`) matches what `vite build` actually produces before deploying.

- [ ] **Step 4: Final full-suite run**

Run: `npm run typecheck && npx vitest run`
Expected: all tests PASS.

No commit is required for this task unless Step 2 surfaced and fixed a bug.

---

## Self-Review Notes

- **Spec coverage:** §1–§7 (problem, goal, non-goals, architecture, data model, redirect flow, dashboard) → Tasks 2–13. §8 (visual direction) → Task 14. §9 (error handling) → fallback page in Task 6, empty/loading states throughout Tasks 9–13. §10 (testing priorities) → Tasks 2–6 cover redirect correctness, RLS, and triggers in that priority order; Tasks 7–13 cover dashboard components. §11 (tech stack) → Task 1. §12 (env vars) → Task 1's `.env.example`/`.dev.vars.example`, Task 15's production secrets checklist. §13 (open questions) is explicitly out of scope and has no task.
- **Gap found and closed during planning:** the spec's Login screen (§7.1) only described sign-in, but §2's "shop owner registers their shop" implies self-serve sign-up (confirmed during brainstorming as multi-tenant SaaS). Task 7's `LoginPage` includes a sign-in/sign-up toggle to close this gap.
- **Bug found and fixed during planning:** the spec's illustrative trigger SQL (§5) used `encode(gen_random_bytes(6), 'base64url')` for slug generation — Postgres's `encode()` only gained a `base64url` format in version 19. Task 4 uses `hex` encoding instead, which is portable and always URL-safe.
- **Type/name consistency:** `LinksRepository`, `LinkLookup`, `RecordClickInput` (Task 6) are used identically in `redirect.ts`, `redirect.test.ts`, and `supabaseLinksRepository.ts`. `useCollection<T extends CollectionRow>` (Task 9) is used with the same generic shape in `EmployeesPage` (Task 10). `get_leaderboard`/`get_click_trend` parameter names (`p_from`, `p_to`, `p_destination_id`, `p_granularity`) match exactly between the migration (Task 5) and every `supabase.rpc(...)` call site (Tasks 12–13).
