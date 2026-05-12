/**
 * FX-aware aggregation built on top of `stats.ts` + `fx.ts`.
 * Pure functions; the dashboard fetches the snapshot once and passes it in.
 */

import { convertCents, type RateSnapshot } from "./fx";
import {
  normalizeToMonthlyCents,
  normalizeToYearlyCents,
  type CategorySlice,
  type SubLike,
} from "./stats";

export type ConvertedTotals = {
  monthlyCents: number;
  yearlyCents: number;
  /** Subscriptions we couldn't convert (currency not in snapshot). */
  unconverted: Array<{ currency: string; monthlyCents: number; yearlyCents: number }>;
};

/**
 * Sum active subs after converting each to `displayCurrency`. Unconverted
 * subs (currency missing from snapshot) are accumulated separately so we can
 * surface the gap rather than silently dropping spend.
 */
export function totalsInDisplayCurrency(
  subs: readonly SubLike[],
  displayCurrency: string,
  snapshot: RateSnapshot
): ConvertedTotals {
  let monthly = 0;
  let yearly = 0;
  const unconvertedMap = new Map<string, { m: number; y: number }>();

  for (const s of subs) {
    if (s.status !== "active") continue;
    const m = Math.round(normalizeToMonthlyCents(s.amountCents, s.billingCycle, s.cycleDays));
    const y = Math.round(normalizeToYearlyCents(s.amountCents, s.billingCycle, s.cycleDays));
    const cm = convertCents(m, s.currency, displayCurrency, snapshot);
    const cy = convertCents(y, s.currency, displayCurrency, snapshot);
    if (cm === null || cy === null) {
      const u = unconvertedMap.get(s.currency) ?? { m: 0, y: 0 };
      u.m += m;
      u.y += y;
      unconvertedMap.set(s.currency, u);
      continue;
    }
    monthly += cm;
    yearly += cy;
  }

  return {
    monthlyCents: monthly,
    yearlyCents: yearly,
    unconverted: [...unconvertedMap.entries()]
      .map(([currency, v]) => ({
        currency,
        monthlyCents: v.m,
        yearlyCents: v.y,
      }))
      .sort((a, b) => b.yearlyCents - a.yearlyCents),
  };
}

/** Category breakdown after converting every sub into `displayCurrency`. */
export function categoryBreakdownConverted(
  subs: readonly SubLike[],
  displayCurrency: string,
  snapshot: RateSnapshot
): CategorySlice[] {
  const map = new Map<string, { monthly: number; count: number }>();
  for (const s of subs) {
    if (s.status !== "active") continue;
    const m = normalizeToMonthlyCents(s.amountCents, s.billingCycle, s.cycleDays);
    const converted = convertCents(Math.round(m), s.currency, displayCurrency, snapshot);
    if (converted === null) continue;
    const cur = map.get(s.category) ?? { monthly: 0, count: 0 };
    cur.monthly += converted;
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
