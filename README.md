# SubTracker

Local-first tracker for recurring software subscriptions — Vercel, GitHub, OpenAI credits, domains, SaaS tools. Built to run on `localhost` against a local Postgres, so no data leaves the machine.

> Single-user by design. No multi-tenancy, no signup, no email parsing, no bank sync. One password, one Docker container, one Next.js app.

## What it does

- Track recurring subscriptions in any currency
- See **monthly** and **yearly** burn at a glance
- Per-currency subtotals out of the box; optional **FX conversion** to a single display currency (via [frankfurter.dev](https://frankfurter.dev), ECB daily rates, 24h cached, offline-tolerant)
- Upcoming renewals list (7- and 30-day windows)
- Category breakdown pie chart
- Edit / pause / resume / delete inline
- Dark mode, mobile-responsive
- Single-password gate (HMAC-signed cookie, Edge-runtime safe)

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (`strict` + `noUncheckedIndexedAccess`) |
| DB | Postgres 16 (Docker) |
| ORM | Drizzle |
| UI | Tailwind v4 + shadcn/ui (radix-nova) |
| Charts | Recharts |
| Forms | react-hook-form + Zod |
| Auth | Single password + HMAC cookie (no NextAuth) |
| Tests | Vitest (51 unit tests for renewals, stats, FX) |

## Quick start

Prereqs: `pnpm`, Docker.

```bash
# 1. clone, install
pnpm install

# 2. spin up Postgres
docker compose up -d

# 3. copy env (edit APP_PASSWORD + AUTH_SECRET)
cp .env.example .env.local

# 4. apply migrations
pnpm db:migrate

# 5. (optional) seed 3 example subscriptions
pnpm db:seed

# 6. run dev server
pnpm dev
```

Open <http://localhost:3000>. Default password from `.env.example` is `changeme` — change it before doing anything serious.

## Commands

| Action | Command |
|---|---|
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Typecheck | `pnpm typecheck` |
| Lint | `pnpm lint` |
| Tests | `pnpm test` (`pnpm test:watch` for watch mode) |
| Generate migration | `pnpm db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Drizzle Studio | `pnpm db:studio` |
| Seed example data | `pnpm db:seed` |

## Architecture sketch

```
src/
├── app/
│   ├── (app)/             gated route group (middleware redirects to /login)
│   │   ├── dashboard/     stats cards + upcoming + category chart
│   │   ├── subscriptions/ list, [id] edit, new
│   │   └── settings/      display-currency selector
│   ├── api/auth/          POST/DELETE login/logout
│   ├── login/             single-password form
│   ├── layout.tsx         ThemeProvider + Toaster mount
│   └── global-error.tsx
├── components/
│   ├── ui/                shadcn primitives
│   ├── subscriptions/     SubscriptionForm + RowActions
│   └── dashboard/         StatsCards, UpcomingRenewals, CategoryChart
├── db/
│   ├── schema.ts          subscriptions, payments, settings
│   ├── client.ts          drizzle + postgres-js
│   ├── seed.ts            idempotent example data
│   └── migrations/
├── lib/
│   ├── env.ts             Zod-validated process.env, crash-fast
│   ├── auth.ts            HMAC-SHA256 cookie, constant-time pw compare
│   ├── money.ts           integer-cents formatter + parser
│   ├── renewals.ts        addMonths day-clamped, computeNextRenewal
│   ├── stats.ts           per-currency totals, category breakdown
│   ├── stats-fx.ts        FX-converted totals (built on stats + fx)
│   ├── fx.ts              frankfurter.dev fetch + 24h cache + offline fallback
│   └── format.ts          dates + cycle labels
├── server/
│   ├── settings.ts        getSettings (singleton row)
│   └── actions/           createSubscription, updateSubscription, ...
└── middleware.ts          cookie gate
```

## Design rules (worth knowing if you fork this)

- **Integer cents only** for money. No floats. Display via `Intl.NumberFormat`.
- **Server components by default.** `'use client'` reserved for forms, dropdowns, charts.
- **Mutations go through server actions**, not API routes. Only exception: `/api/auth`.
- **Validate at every trust boundary** with Zod: form inputs, env vars, server-action inputs.
- **No `any`.** No default exports outside Next page/layout slots.
- **One password gate.** No NextAuth / Lucia / better-auth. Single `APP_PASSWORD` env var, HMAC-signed cookie via Web Crypto so it works in Edge middleware.

See [docs/DECISIONS.md](./docs/DECISIONS.md) for the full reasoning trail.

## License

Personal project. No license attached — clone for inspiration, don't redistribute as-is.
