# SubTracker

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Postgres](https://img.shields.io/badge/Postgres-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-c5f74f?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-51%20tests-6e9f18?logo=vitest&logoColor=white)](https://vitest.dev)

A **local-first** personal tracker for recurring software subscriptions — Vercel, GitHub, OpenAI credits, domains, SaaS tools. Built to run on `localhost` against a local Postgres so no data leaves the machine.

> Single-user by design. No multi-tenancy, no signup, no email parsing, no bank sync. One password, one Docker container, one Next.js app.

---

## Why this exists

I kept losing track of which dev subscriptions auto-renew when. Existing trackers either want my bank login, push everything to a third-party cloud, or charge $10/mo to track my $4/mo GitHub Pro. This is the boring, local, "show me a number, remind me before renewal" version — built as an excuse to ship a tight, modern Next.js stack end-to-end.

---

## Features

**Tracking**
- Add subscriptions with name, vendor, amount, currency, cycle, category, notes
- Billing cycles: weekly, monthly, yearly, or every N days
- Status: active / paused / canceled (paused = excluded from totals, kept in list)
- Inline edit, pause/resume, delete (with confirmation)

**Dashboard**
- Monthly + yearly burn at a glance
- Active subscription count
- Renewing-soon counts for 7-day and 30-day windows
- Upcoming renewals list (clickable to edit)
- Category breakdown pie chart

**Money & currency**
- **Integer cents everywhere** — no floats, no `toFixed`, no rounding bugs
- Multi-currency entry (USD, EUR, GBP, INR, JPY, CAD, AUD, CHF, CNY out of the box; any 3-letter ISO accepted)
- Per-currency subtotals by default
- Optional **FX conversion** to a single display currency via [frankfurter.dev](https://frankfurter.dev) (ECB daily rates, 24h cached, offline-tolerant with "rates from \<date\>" fallback)

**Auth**
- Single password gate via HMAC-SHA256 signed cookie
- Edge-runtime safe (Web Crypto only — no `node:crypto`)
- Constant-time password comparison
- 30-day cookie expiry

**UX**
- Dark mode toggle (system / light / dark, persisted)
- Mobile-responsive header (icon-only nav on small screens)
- Sonner toasts on every mutation
- Loading skeletons per route
- Route-scoped error boundary + global error fallback
- Empty states with CTAs
- Friendly 404 for missing subscriptions

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Turbopack dev + build |
| Language | TypeScript | `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride` |
| DB | Postgres 16 | `postgres:16-alpine` via Docker |
| ORM | Drizzle | + drizzle-kit migrations |
| UI | Tailwind v4 + shadcn/ui | radix-nova style, CSS variables |
| Charts | Recharts | Pie chart in a client component |
| Forms | react-hook-form + Zod | Shared schema for form + server action |
| Auth | Custom HMAC cookie | No NextAuth / Lucia / etc. |
| Tests | Vitest | 51 unit tests for money/renewals/stats/FX |
| Hosting (optional) | Vercel + Neon | Single-user deploy, gate via same password |

See [docs/DECISIONS.md](./docs/DECISIONS.md) for the full reasoning trail (13 ADRs).

---

## Quick start

Prereqs: `pnpm` (≥10), Docker, Node ≥20.

```bash
# 1. clone + install
git clone https://github.com/skalkii/subtracker.git
cd subtracker
pnpm install

# 2. start Postgres (alpine, ~30MB)
docker compose up -d

# 3. copy env — edit APP_PASSWORD + AUTH_SECRET before anything serious
cp .env.example .env.local

# 4. apply migrations
pnpm db:migrate

# 5. (optional) seed 3 example subscriptions
pnpm db:seed

# 6. run dev server
pnpm dev
```

Open <http://localhost:3000>. Default password from `.env.example` is `changeme` — **change it**.

### Generate a secure `AUTH_SECRET`

```bash
openssl rand -hex 32
```

Paste the output into `.env.local`. Must be ≥32 chars; Zod validates this at startup and crashes loudly otherwise.

---

## Commands

| Action | Command |
|---|---|
| Dev server | `pnpm dev` |
| Production build | `pnpm build` |
| Production start | `pnpm start` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Run tests | `pnpm test` |
| Tests in watch mode | `pnpm test:watch` |
| Generate migration | `pnpm db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Drizzle Studio (DB GUI) | `pnpm db:studio` |
| Seed example data | `pnpm db:seed` |
| Stop Postgres | `docker compose stop` |
| Reset DB (deletes data) | `docker compose down -v` |

---

## Environment variables

Validated at startup via Zod in `src/lib/env.ts`. App refuses to boot if any are missing or malformed.

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://...` connection string. Matches `docker-compose.yml` defaults. |
| `APP_PASSWORD` | yes | Any non-empty string. Constant-time compared on login. |
| `AUTH_SECRET` | yes | ≥32 chars. HMAC key for the auth cookie. Generate via `openssl rand -hex 32`. |
| `NODE_ENV` | no | `development` / `test` / `production`. Auto-detected. Controls cookie `Secure` flag. |

---

## Data model

Three tables, no junction tables, no users table.

```
subscriptions
├─ id              text (cuid2) PK
├─ name            text
├─ vendor          text
├─ amount_cents    integer            ← NEVER float
├─ currency        text (ISO 4217)
├─ billing_cycle   enum (monthly | yearly | weekly | custom_days)
├─ cycle_days      integer NULL       ← only when billing_cycle = custom_days
├─ next_renewal_at timestamptz
├─ started_at      date
├─ status          enum (active | canceled | paused) default 'active'
├─ category        text
├─ notes           text NULL
├─ created_at      timestamptz default now()
└─ updated_at      timestamptz default now()
  indexes: (next_renewal_at), (status)

payments                              ← scaffolded, not yet written to in v1
├─ id              text (cuid2) PK
├─ subscription_id text FK → subscriptions ON DELETE CASCADE
├─ amount_cents    integer
├─ currency        text
├─ paid_at         timestamptz
└─ created_at      timestamptz default now()

settings                              ← singleton row, id=1
├─ id              integer PK default 1
├─ display_currency text NULL         ← null = per-currency subtotals
└─ updated_at      timestamptz default now()
```

---

## Project layout

```
src/
├── app/
│   ├── (app)/                  gated route group; middleware redirects to /login
│   │   ├── dashboard/          stats cards + upcoming + category chart
│   │   ├── subscriptions/      list, /new, /[id] edit, not-found
│   │   ├── settings/           display-currency selector
│   │   ├── layout.tsx          header nav + theme toggle + logout
│   │   ├── error.tsx           route-scoped error boundary
│   │   └── logout-button.tsx
│   ├── api/auth/               POST login, DELETE logout
│   ├── login/                  single-password form
│   ├── layout.tsx              ThemeProvider + Toaster mount
│   ├── global-error.tsx        framework-level error fallback
│   └── page.tsx                root → redirect to /dashboard
├── components/
│   ├── ui/                     shadcn primitives (button, input, table, ...)
│   ├── subscriptions/          SubscriptionForm, RowActions, form-defaults
│   ├── dashboard/              StatsCards, UpcomingRenewals, CategoryChart
│   └── theme-toggle.tsx        sun/moon, useSyncExternalStore mount gate
├── db/
│   ├── schema.ts               subscriptions, payments, settings
│   ├── client.ts               drizzle + postgres-js
│   ├── seed.ts                 idempotent example data
│   └── migrations/             generated SQL + drizzle-kit snapshots
├── lib/
│   ├── env.ts                  Zod-validated process.env; crash-fast
│   ├── auth.ts                 HMAC-SHA256 cookie sign/verify, const-time pw compare
│   ├── money.ts                integer-cents formatter + parser
│   ├── renewals.ts             addMonths day-clamped, computeNextRenewal
│   ├── stats.ts                per-currency totals, category breakdown
│   ├── stats-fx.ts             FX-converted totals
│   ├── fx.ts                   frankfurter.dev fetch + 24h cache + fallback
│   ├── format.ts               date + cycle label helpers
│   └── schemas/subscription.ts shared Zod schema (form + server action)
├── server/
│   ├── settings.ts             getSettings (singleton row, auto-insert)
│   └── actions/                createSubscription, updateSubscription,
│                               deleteSubscription, setSubscriptionStatus, updateSettings
└── middleware.ts               cookie gate, matcher excludes /login + /api/auth + static
```

---

## Testing

51 unit tests across 3 files. No DB or network required for the suite.

```bash
pnpm test
```

| File | Coverage |
|---|---|
| `src/lib/renewals.test.ts` | 26 tests · day-clamping (Jan31→Feb28, Feb29 leap), Dec→Jan rollover, weekly/monthly/yearly/custom_days, future-dated start, infinite-loop cap |
| `src/lib/stats.test.ts` | 15 tests · normalize-to-monthly/yearly per cycle, currency grouping, status filtering, upcoming-within-window, category breakdown |
| `src/lib/fx.test.ts` | 10 tests · convertCents identity + re-base, missing currency null, 24h cache hit/miss, offline fallback (fetch mocked) |

---

## Design rules

If you fork or borrow patterns:

- **Integer cents only** for money. No floats. Display via `Intl.NumberFormat`. Helpers live in `src/lib/money.ts`.
- **Server components by default.** `'use client'` reserved for forms, dropdowns, charts.
- **Mutations go through server actions**, not API routes. Only exception: `/api/auth` (needs to set/clear cookies via headers).
- **Validate at every trust boundary** with Zod: form inputs, env vars, server-action inputs.
- **No `any`.** Use `unknown` and narrow.
- **No default exports** except Next.js pages/layouts (framework requirement).
- **No throws across the client boundary.** Server actions return `{ ok: true, data } | { ok: false, error: string }`.
- **One password gate.** No NextAuth / Lucia / better-auth. Single `APP_PASSWORD` env var, HMAC-signed cookie, Web Crypto only so it runs in Edge middleware.

---

## Deploying (optional)

The app runs entirely on localhost — you don't need to deploy it. But if you want it accessible from a phone or a different machine:

1. Push to GitHub (already done in this repo).
2. Spin up a Postgres database on [Neon](https://neon.tech) (free tier).
3. Deploy to Vercel from the GitHub repo.
4. Set env vars: `DATABASE_URL` (Neon connection string), `APP_PASSWORD`, `AUTH_SECRET`.
5. Run migrations against the prod DB:
   ```bash
   DATABASE_URL=<neon-url> pnpm db:migrate
   ```

The single-password gate is the only auth mechanism — keep `APP_PASSWORD` strong and `AUTH_SECRET` rotated.

---

## What's deferred to v2

- **Payments table** is scaffolded but not yet written to. A future "Mark paid" action would insert a row and advance `next_renewal_at` by one cycle automatically.
- **Background job** to auto-advance `next_renewal_at` when the date passes (currently user-initiated via the "Compute from start" button on the form).
- **Notifications** — reminder emails / browser push before renewals. v1 ships with the in-dashboard "Renewing soon" card only.
- **Bank sync / email parsing** — explicitly out of scope, see [docs/DECISIONS.md](./docs/DECISIONS.md) §1.
- **Mobile app** — responsive web is good enough for v1.
- **`proxy.ts` migration** — Next 16 deprecated `middleware.ts` in favor of `proxy.ts`. Cosmetic, build still works; renaming is a future chore.

---

## License

Personal project. No license attached — clone for inspiration, don't redistribute as-is.

Built with intent. Read [docs/DECISIONS.md](./docs/DECISIONS.md) if you want the why.
