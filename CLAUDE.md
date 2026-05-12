# Project: SubStack — Personal Dev Subscription Tracker

> **Handoff file for Claude Code.** Read this in full before any code changes. This file is the source of truth.

---

## 1. What we're building

A **local-first personal tool** to track my recurring software subscriptions (Vercel, GitHub, OpenAI credits, domains, SaaS tools, etc.), see total monthly/yearly burn, and get reminded before renewals.

**Target user:** me. One user. No multi-tenancy, no auth provider, no signup flow.

**Why "local-first":** runs on `localhost` against a local Postgres. No deployed server, no cloud cost, no data leaving my machine. Optional: deploy a single-user instance to Vercel later, gated by a single password env var.

**Success criteria for v1:**
- Add a subscription in <10 seconds (name, amount, currency, cycle, next renewal)
- Dashboard shows: monthly burn, yearly burn, next 7 days of renewals, category breakdown
- Edit / delete / pause subscriptions
- Runs with `pnpm dev` after one `docker compose up` for Postgres
- Works offline once started

**Non-goals for v1 (resist scope creep):**
- No multi-user / auth provider
- No email parsing
- No bank sync
- No notifications (in-app banner only)
- No mobile app (responsive web is enough)

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components for the dashboard, single repo |
| Language | TypeScript (strict) | Non-negotiable |
| DB | Postgres 16 via Docker | Local, free, real SQL (not SQLite) |
| ORM | Drizzle | Type-safe, lightweight, no codegen |
| UI | Tailwind + shadcn/ui | Fast, looks good without effort |
| Charts | Recharts | Lightweight, works in RSC |
| Forms | react-hook-form + Zod | Standard |
| Auth | **Single password gate** via middleware | One user, one password env var. No NextAuth. |
| Deploy (optional) | Vercel + Neon | Only if I decide to host it later |

**Do not swap any of these without explicit approval.** Propose alternatives in chat first.

---

## 3. Repository layout

```
substack/
├── CLAUDE.md                  ← you are here
├── README.md                  ← short, for the GitHub portfolio page
├── docker-compose.yml         ← just Postgres
├── .env.example
├── docs/
│   ├── DECISIONS.md           ← every meaningful tech choice + reasoning
│   └── SCREENSHOTS/           ← for the README and portfolio
├── src/
│   ├── app/
│   │   ├── (app)/             ← gated routes: dashboard, subs, settings
│   │   │   ├── dashboard/
│   │   │   ├── subscriptions/
│   │   │   └── layout.tsx
│   │   ├── login/             ← single-password gate
│   │   ├── api/
│   │   │   └── auth/          ← password check + cookie set
│   │   ├── layout.tsx
│   │   └── middleware.ts      ← redirects to /login if no cookie
│   ├── components/
│   │   ├── ui/                ← shadcn primitives
│   │   ├── subscription-form.tsx
│   │   ├── subscription-list.tsx
│   │   └── stats-cards.tsx
│   ├── db/
│   │   ├── schema.ts
│   │   ├── client.ts
│   │   └── migrations/
│   ├── lib/
│   │   ├── env.ts             ← Zod-validated env at startup
│   │   ├── currency.ts        ← FX conversion + display
│   │   ├── renewals.ts        ← next-renewal date computation
│   │   └── money.ts           ← integer-cents helpers
│   └── server/
│       └── actions/           ← server actions (createSub, updateSub, deleteSub)
├── .claude/
│   ├── settings.json          ← hooks, permissions
│   ├── skills/
│   │   └── add-migration/     ← generate + apply drizzle migration
│   └── agents/
│       └── schema-reviewer.md ← reviews db schema changes
└── package.json
```

---

## 4. Commands

| Action | Command |
|---|---|
| Start Postgres | `docker compose up -d` |
| Dev server | `pnpm dev` |
| Build | `pnpm build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Generate migration | `pnpm db:generate` |
| Apply migrations | `pnpm db:migrate` |
| Open db studio | `pnpm db:studio` |

Use `pnpm`, not `npm` or `yarn`.

---

## 5. Data model (v1)

Two tables. Keep it boring.

**`subscriptions`**
- `id` — text, cuid2
- `name` — text, e.g. "Vercel Pro"
- `vendor` — text, e.g. "Vercel" (for grouping)
- `amount_cents` — integer (NEVER use float for money)
- `currency` — text, ISO 4217 (USD, EUR, INR, etc.)
- `billing_cycle` — enum: `monthly` | `yearly` | `weekly` | `custom_days`
- `cycle_days` — integer, nullable (only set when cycle = `custom_days`)
- `next_renewal_at` — timestamptz
- `started_at` — date
- `status` — enum: `active` | `canceled` | `paused`
- `category` — text, e.g. "infra", "ai", "domains", "tools"
- `notes` — text, nullable
- `created_at`, `updated_at` — timestamptz

**`payments`** (historical record, optional in v1 — nice for charts later)
- `id`, `subscription_id` (fk), `amount_cents`, `currency`, `paid_at`, `created_at`

No `users` table. There is one user, identified implicitly. If I ever multi-user this, that's a v2 conversation.

---

## 6. Auth (the single-password approach)

There is **one password**, stored as `APP_PASSWORD` env var.

- `POST /api/auth` accepts `{ password }`. Constant-time compare against `APP_PASSWORD`. On match, set an HTTP-only signed cookie (`auth=<hmac>`, 30-day expiry).
- `middleware.ts` checks the cookie on every `/app/*` route. Missing or invalid → redirect to `/login`.
- Sign the cookie with `AUTH_SECRET` (Zod-validated, must be ≥32 chars).

That's the entire auth system. Don't add NextAuth, Lucia, better-auth, or anything else. This is intentional.

---

## 7. Conventions (non-negotiable)

### TypeScript
- `strict: true`, `noUncheckedIndexedAccess: true`
- No `any`. Use `unknown` and narrow.
- No default exports except Next.js pages/layouts (framework requirement).
- Validate at every trust boundary with Zod: form inputs, env vars, server action inputs.

### React / Next.js
- **Server Components by default.** `'use client'` only for forms, modals, charts.
- Mutations go through **server actions**, not API routes (except `/api/auth`).
- Forms: `react-hook-form` + Zod resolver. No raw `useState` form chains.

### Database
- All schema changes go through Drizzle migrations. Never edit applied migrations.
- Every table has `id` (cuid2), `created_at`, `updated_at`.
- Indexes: at minimum on `next_renewal_at` and `status`.

### Money
- **Integer cents only.** No floats. Ever.
- Display with `Intl.NumberFormat`, never with manual `toFixed(2)`.
- Currency conversion: cache rates in-memory for 24h, source from `exchangerate.host` (free, no key). If offline, fall back to last cached rates and show a small "rates from <date>" note.
- Helpers live in `src/lib/money.ts`. Do not do money math inline.

### Renewal math
- Lives in `src/lib/renewals.ts`. Pure functions, well-tested.
- Handle the Jan 31 → Feb 28 edge case (use last-day-of-month when the day overflows).
- Weekly = +7 days. Monthly = +1 month with day clamping. Yearly = +1 year.
- Custom days = `next = previous + cycle_days`.

### Errors
- No bare `catch (e) {}` blocks.
- Server actions return `{ ok: true, data } | { ok: false, error: string }`. No throwing across the client boundary.
- Display errors as toasts (shadcn `sonner`), not browser alerts.

### Secrets
- Never commit `.env`. Only `.env.example`.
- Validate env vars at startup with Zod in `src/lib/env.ts`. Crash fast if missing.
- Required env: `DATABASE_URL`, `APP_PASSWORD`, `AUTH_SECRET`.

### Commits
- Conventional commits: `feat/fix/chore/docs(scope): description`
- One concern per commit.

---

## 8. Build order

Vertical slices. Don't scaffold everything upfront.

1. **Setup** — Next.js + TS + Tailwind + shadcn init + Drizzle + docker-compose for Postgres. Verify `pnpm dev` works and the page loads.
2. **Single-password auth** — `/login` page, `/api/auth` route, middleware, signed cookie. Verify gating works.
3. **Schema + migration** — `subscriptions` table. Apply migration. Seed 3 example rows.
4. **List view** — `/app/subscriptions` shows all subs in a table with name, amount, cycle, next renewal.
5. **Add form** — Modal or `/app/subscriptions/new` with react-hook-form + Zod. Server action `createSubscription`.
6. **Edit + delete + pause** — Inline edit or detail page. Server actions for each.
7. **Renewal math** — `src/lib/renewals.ts` with unit tests. Wire into create/update so `next_renewal_at` is computed.
8. **Dashboard** — `/app/dashboard` with stats cards (monthly, yearly, count of active), upcoming renewals list (next 7 / 30 days), category pie chart.
9. **Currency display** — multi-currency entry, single display currency in dashboard (configurable in settings).
10. **Polish** — empty states, loading states, error toasts, mobile-responsive nav, dark mode.
11. **README + screenshots + DECISIONS.md** for the portfolio.

Stop at each step and verify it works end-to-end before moving on.

---

## 9. What "done" looks like for each step

You're not done with a step until:
- `pnpm typecheck` passes
- `pnpm lint` passes
- For schema changes: migration generated, applied, and the app still runs
- The change is committed with a conventional commit message
- The change is manually testable end-to-end in the dev server (I'll click around and verify)

---

## 10. Subagents

Live in `.claude/agents/`.

- **`schema-reviewer`** — Run before applying any migration. Asks: is this reversible? Are new columns nullable or backfilled? Do existing queries still work?

If you need to do heavy repo-wide reading, spin up an Explore subagent rather than dumping it into main context.

---

## 11. Hooks (in `.claude/settings.json`)

- **PostToolUse on Edit/Write** → `pnpm lint --fix` on the changed `.ts`/`.tsx` file
- **PreToolUse on Bash** → block any command containing `rm -rf`, `git push --force`, or `DROP TABLE`
- **PreToolUse on Edit** → block edits to already-applied migration files

If a hook blocks you, surface it in chat. Don't work around it.

---

## 12. Things to never do

- Touch money math without integer-cents discipline
- Use `any` in TypeScript
- Add NextAuth or any auth library — we have a single password gate
- Skip Zod validation on a server action input
- Commit `.env` files or secrets
- Edit an applied migration file
- Add a dependency without telling me what it does and why we can't write it in <30 lines
- Use `npm` or `yarn` (we use `pnpm`)
- Throw errors across the client/server boundary from server actions
- Ship a feature without an empty state and an error state
- Use floats for currency
- Build a "users" table — this is a single-user app

---

## 13. Open questions to ask me

When ambiguous, STOP and ask. Specifically:

- Display currency default (USD? INR?)
- Whether to show converted totals or per-currency subtotals on the dashboard
- Reminder window for "upcoming renewals" (7 days? 14? configurable?)
- Whether to support attachments/receipts later (probably no for v1)

Default to the simplest reasonable choice and flag it in chat.

---

## 14. References

- Drizzle: https://orm.drizzle.team
- shadcn/ui: https://ui.shadcn.com
- Next.js App Router: https://nextjs.org/docs/app
- Recharts: https://recharts.org
- Postgres on Docker: `postgres:16-alpine` image, default settings fine for local

When in doubt about an API, **read the docs before writing code**. Don't pattern-match from memory.

---

*End of handoff. Confirm you've read this before making your first code change.*
