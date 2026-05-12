# Architecture Decisions

A running log of meaningful tech choices, why they were made, and what we'd reconsider.

---

## 1. Local-first, single-user — no auth provider, one password gate

**Decision.** No NextAuth, no Lucia, no better-auth. A single `APP_PASSWORD` env var; on submit, we constant-time-compare to the env var and issue an HMAC-SHA256 signed cookie (`auth=<base64url(payload)>.<base64url(sig)>`, 30-day expiry). Middleware verifies the cookie on every gated route.

**Why.** This is a personal tracker. One human, running on `localhost` against a local Postgres. An auth provider would mean:
- a users table we don't need,
- OAuth callbacks we'd never use,
- session storage we don't want,
- an extra failure mode (vendor downtime / breaking changes).

**Constraints worth knowing.**
- Cookie signing uses **Web Crypto** (`crypto.subtle`), not `node:crypto`, because Next.js middleware runs in the Edge runtime. Native `node:crypto` is unavailable there.
- `AUTH_SECRET` must be ≥32 chars — Zod-validates on startup so the app crashes fast on a misconfigured env.

**When to reconsider.** If a second human ever needs to use this, scrap it and pick a real auth provider.

---

## 2. Postgres in Docker, not SQLite

**Decision.** Postgres 16 (`postgres:16-alpine`) via `docker-compose.yml`. Drizzle as the ORM.

**Why.**
- I want **real SQL types** — `timestamptz`, native enums, partial indexes — not SQLite approximations.
- The eventual cloud target (Neon) is Postgres-compatible, so dev mirrors prod.
- Docker keeps it isolated and reproducible. One command to start, one to stop, no system-wide install.
- Drizzle is type-safe, lightweight, and has a sane migration story (`drizzle-kit generate` → SQL file in `src/db/migrations/` → `drizzle-kit migrate`).

**Trade-off.** Requires Docker to be running. For a true "click-to-run" UX a SQLite mode would be friendlier, but that's a v2 thing.

---

## 3. Integer cents for money. No floats. Ever.

**Decision.** Every monetary value in the schema is `integer amount_cents`. All math is done as integers; display goes through `Intl.NumberFormat`. The two helpers in `src/lib/money.ts` are the only places that translate between integer cents and human display.

**Why.** Floats are wrong for money. `0.1 + 0.2 !== 0.3`. Subtle rounding bugs compound across renewal cycles. The handoff document codifies this; the type system enforces it (`integer` in Drizzle); `formatCents` throws if you pass a non-integer.

**Reading.** Frankel et al's *Patterns of Enterprise Application Architecture* — Money pattern.

---

## 4. Renewal math lives in pure functions with unit tests

**Decision.** `src/lib/renewals.ts` has zero side effects, accepts UTC `Date` objects, returns `Date` objects. The only file with a complete unit test suite (26 cases): Jan 31 → Feb 28, Feb 29 + 1 year clamping, Dec → Jan rollover, weekly = +7, `custom_days` = +N, infinite-loop cap.

**Why.** Date math is where subtle bugs hide. "Jan 31 + 1 month" doesn't exist — we clamp to the last day of February. Without tests this would silently break every February. Pure functions + Vitest means we can refactor with confidence and run them in 200ms.

**Day-clamping rule.** When advancing months/years lands on a non-existent day, clamp to the last valid day of the target month. This matches how every real billing system (Stripe, Recurly, banks) behaves.

---

## 5. Server actions for mutations, not API routes

**Decision.** Every create/update/delete goes through a `"use server"` function in `src/server/actions/`. The only API route in the app is `POST /api/auth` (login) and `DELETE /api/auth` (logout) — they can't be server actions because middleware needs to set/clear the cookie via response headers, and we want them callable from a `fetch` in the login form.

**Why.**
- Server actions are co-located with the data they mutate.
- Type safety end-to-end without writing a separate API client.
- `revalidatePath` is built in.
- Less ceremony.

**Pattern.** Actions return a discriminated union: `{ ok: true, data } | { ok: false, error: string }`. No throws across the client boundary. Errors surface as toasts (Sonner) and inline messages.

---

## 6. Two types for the form schema: `z.input` vs `z.output`

**Decision.** `SubscriptionInputSchema` has `.transform()` calls that change the shape. `react-hook-form` registers raw form values (strings, undefined for unchecked fields). The server action receives the transformed shape (e.g. `cycleDays: number | null` after coercion). We export both:

```ts
export type SubscriptionInput = z.output<typeof SubscriptionInputSchema>;
export type SubscriptionInputRaw = z.input<typeof SubscriptionInputSchema>;
```

`useForm<SubscriptionInputRaw, unknown, SubscriptionInput>` makes the resolver typecheck cleanly.

**Why.** Without the split, TypeScript complains that RHF's `register` returns string but the schema's `cycleDays` is `number | null`. The two-type pattern is the cleanest way to express "what the form holds" vs "what survived validation."

---

## 7. FX rates: frankfurter.dev, not exchangerate.host

**Decision.** Swapped from the originally-planned `exchangerate.host` to `frankfurter.dev` because the former now requires an API access key. Frankfurter is free, no key, sources from the ECB daily, and follows redirects from `frankfurter.app` → `frankfurter.dev/v1`.

**Caching.** In-memory `Map`, 24h TTL, keyed by base currency. On fetch failure, return the last cached snapshot with `fresh: false` so the UI shows "rates from <date>" instead of crashing.

**Conversion.** `convertCents(cents, from, to, snapshot)` is pure, rounds to the nearest integer cent, re-bases via `rateFrom / rateTo` when the snapshot's base isn't `from`. Unit tested with mock snapshots (no network).

**Trade-off.** Mid-market rates only. If you ever care about retail FX (the rate your bank actually charges you), you'd need a different source — and probably wouldn't be tracking subscriptions in this app to begin with.

---

## 8. Per-currency subtotals by default, FX conversion opt-in

**Decision.** With `displayCurrency` unset (`NULL` in `settings`), the dashboard shows the largest-yearly currency as the headline and lists other currencies as "+ €4.95, + ₹450" subtotals. With `displayCurrency` set, every subscription is converted into that currency for a single grand total — and any sub whose currency is missing from the FX snapshot is surfaced separately, not silently dropped.

**Why.** Most people have 1-2 currencies; subtotals are honest and require no network. Conversion is helpful when the wallet is mixed, but it shouldn't be the default because:
- it requires a network call (slows first paint),
- it can be wrong/stale,
- it implies a precision the FX market doesn't have.

---

## 9. Single-row `settings` table, no schema gymnastics

**Decision.** `settings` is one row with `id = 1` and a default. The app upserts to that fixed key. No fancy `singleton` enforcement constraint.

**Why.** It's a personal tracker. We're not optimizing for a hostile multi-tenant scenario. The cost of the wrong row being inserted is "the user sees the wrong currency for one render"; the cost of overengineering this is real today.

---

## 10. Tailwind v4 + shadcn/ui (radix-nova)

**Decision.** Tailwind v4 (already shipped via `create-next-app`), shadcn primitives copy-pasted into `src/components/ui/`, radix-nova style.

**Why.**
- shadcn's "you own the code" model means I can edit components when defaults don't fit.
- Radix primitives give accessibility (focus management, ARIA, keyboard) for free.
- Tailwind v4's CSS-first config (no `tailwind.config.ts`) is a nicer dev loop.

**Footnote.** shadcn radix-nova doesn't ship a Form wrapper component. I use raw `<form>` + `react-hook-form` + shadcn `Label`/`Input`/`Select`, which works fine for this size of project.

---

## 11. Middleware lives at `src/middleware.ts`, not `src/app/middleware.ts`

**Decision.** Next.js requires middleware at `src/middleware.ts` (or repo root). The original handoff doc said `src/app/middleware.ts`; that was a typo. Doc patched.

**Why noted.** A reader following the handoff layout would put it in the wrong place and get silent failures (no gating, no redirect to /login).

---

## 12. No background renewal-advancing job (yet)

**Decision.** `computeNextRenewal` is wired into the form as a "Compute from start" button — user-initiated. There's no cron / scheduled job that automatically advances `next_renewal_at` once a payment lands.

**Why.** Payments aren't recorded yet. When they are (the `payments` table exists for this), the natural extension is "on insert into payments, advance the parent subscription's `next_renewal_at` by one cycle." That's a v2 slice; not blocking v1.

---

## 13. Vitest, not Jest, for unit tests

**Decision.** Vitest with `@/` alias mirroring tsconfig. No setup file. Tests live next to source as `*.test.ts`.

**Why.** Native ESM, faster than Jest, no babel transform needed for TS. Co-location keeps the test next to the code it's testing — better navigability than `__tests__/` folders.
