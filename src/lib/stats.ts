/**
 * Stats aggregations. Pure, currency-aware (no FX conversion in v1; totals are
 * grouped per currency).
 */

import type { BillingCycle } from "./renewals";

export type SubLike = {
  amountCents: number;
  currency: string;
  billingCycle: BillingCycle;
  cycleDays: number | null;
  status: "active" | "canceled" | "paused";
  nextRenewalAt: Date | string;
  category: string;
};

const DAYS_PER_MONTH = 365 / 12; // 30.4167
const DAYS_PER_YEAR = 365;
const WEEKS_PER_MONTH = DAYS_PER_MONTH / 7;
const WEEKS_PER_YEAR = 52;

/** Normalize a single subscription's amount to monthly equivalent in cents. */
export function normalizeToMonthlyCents(
  amountCents: number,
  cycle: BillingCycle,
  cycleDays: number | null
): number {
  switch (cycle) {
    case "monthly":
      return amountCents;
    case "yearly":
      return amountCents / 12;
    case "weekly":
      return amountCents * WEEKS_PER_MONTH;
    case "custom_days":
      if (!cycleDays || cycleDays <= 0) return 0;
      return (amountCents * DAYS_PER_MONTH) / cycleDays;
  }
}

export function normalizeToYearlyCents(
  amountCents: number,
  cycle: BillingCycle,
  cycleDays: number | null
): number {
  switch (cycle) {
    case "monthly":
      return amountCents * 12;
    case "yearly":
      return amountCents;
    case "weekly":
      return amountCents * WEEKS_PER_YEAR;
    case "custom_days":
      if (!cycleDays || cycleDays <= 0) return 0;
      return (amountCents * DAYS_PER_YEAR) / cycleDays;
  }
}

export type CurrencyTotal = {
  currency: string;
  /** Rounded to integer cents. */
  monthlyCents: number;
  yearlyCents: number;
};

/**
 * Sum active subscriptions per currency. Only `active` subs count; paused and
 * canceled are excluded from totals.
 */
export function totalsByCurrency(subs: readonly SubLike[]): CurrencyTotal[] {
  const map = new Map<string, { monthly: number; yearly: number }>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    const cur = map.get(s.currency) ?? { monthly: 0, yearly: 0 };
    cur.monthly += normalizeToMonthlyCents(s.amountCents, s.billingCycle, s.cycleDays);
    cur.yearly += normalizeToYearlyCents(s.amountCents, s.billingCycle, s.cycleDays);
    map.set(s.currency, cur);
  }
  return [...map.entries()]
    .map(([currency, v]) => ({
      currency,
      monthlyCents: Math.round(v.monthly),
      yearlyCents: Math.round(v.yearly),
    }))
    .sort((a, b) => b.yearlyCents - a.yearlyCents);
}

export function countByStatus(subs: readonly SubLike[]): {
  active: number;
  paused: number;
  canceled: number;
} {
  const out = { active: 0, paused: 0, canceled: 0 };
  for (const s of subs) out[s.status]++;
  return out;
}

/** Subscriptions whose next renewal falls within `days` from `from` (inclusive). */
export function upcomingWithinDays<T extends SubLike>(
  subs: readonly T[],
  days: number,
  from: Date = new Date()
): T[] {
  const start = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate()
  );
  const end = start + days * 86_400_000 + 86_399_999;
  return subs
    .filter((s) => s.status === "active")
    .filter((s) => {
      const d = typeof s.nextRenewalAt === "string"
        ? new Date(s.nextRenewalAt)
        : s.nextRenewalAt;
      const t = d.getTime();
      return t >= start && t <= end;
    });
}

export type CategorySlice = {
  category: string;
  /** Monthly burn in *cents*, integer. */
  monthlyCents: number;
  count: number;
};

/**
 * Per-category monthly burn. Mixes currencies — caller decides display. Useful
 * when one currency dominates; for mixed currency wallets the chart is still
 * meaningful relative to other categories in the same currency.
 */
export function categoryBreakdown(
  subs: readonly SubLike[],
  currency: string
): CategorySlice[] {
  const map = new Map<string, { monthly: number; count: number }>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    if (s.currency !== currency) continue;
    const cur = map.get(s.category) ?? { monthly: 0, count: 0 };
    cur.monthly += normalizeToMonthlyCents(s.amountCents, s.billingCycle, s.cycleDays);
    cur.count += 1;
    map.set(s.category, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({
      category,
      monthlyCents: Math.round(v.monthly),
      count: v.count,
    }))
    .sort((a, b) => b.monthlyCents - a.monthlyCents);
}
