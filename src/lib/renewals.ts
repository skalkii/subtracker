/**
 * Renewal math. Pure functions, UTC throughout.
 *
 * Day-clamping rule: when advancing months/years would land on a date that
 * doesn't exist (Jan 31 + 1 month, Feb 29 + 1 year on a non-leap year), clamp
 * to the last valid day of the target month. Matches user intuition for
 * monthly subscriptions billed on the last possible day.
 */

export type BillingCycle = "monthly" | "yearly" | "weekly" | "custom_days";

const MS_PER_DAY = 86_400_000;

function lastDayOfMonth(year: number, month: number): number {
  // month is 0-11. Day 0 of next month == last day of month.
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const targetMonth = m + months;
  const targetYear = y + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const clampedDay = Math.min(d, lastDayOfMonth(targetYear, normalizedMonth));
  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/**
 * Advance one billing cycle from `from`.
 * Throws if cycle = "custom_days" and cycleDays is null/<=0.
 */
export function advanceOneCycle(
  from: Date,
  cycle: BillingCycle,
  cycleDays: number | null
): Date {
  switch (cycle) {
    case "weekly":
      return addWeeks(from, 1);
    case "monthly":
      return addMonths(from, 1);
    case "yearly":
      return addYears(from, 1);
    case "custom_days":
      if (cycleDays === null || cycleDays <= 0) {
        throw new Error("custom_days cycle requires a positive cycleDays value");
      }
      return addDays(from, cycleDays);
  }
}

/**
 * Compute the next renewal date that is strictly after `from` by repeatedly
 * advancing one cycle from `startedAt`. Always returns a date strictly > from.
 *
 * Used when:
 *  - creating a sub and we want the next renewal after today
 *  - cron-style processing: payment hit, push next renewal forward one cycle
 *
 * For the common "started recently, just advance once" path this loops once.
 * For "started years ago, want next future renewal" it loops as many cycles
 * as needed.
 */
export function computeNextRenewal(
  startedAt: Date | string,
  cycle: BillingCycle,
  cycleDays: number | null,
  from: Date = new Date()
): Date {
  const start = toUtcMidnight(typeof startedAt === "string" ? new Date(startedAt) : startedAt);
  const target = toUtcMidnight(from);
  let next = start;
  // Cap iterations to avoid pathological infinite loops on malformed input.
  for (let i = 0; i < 10_000; i++) {
    if (next > target) return next;
    next = advanceOneCycle(next, cycle, cycleDays);
  }
  throw new Error("computeNextRenewal: exceeded max iterations");
}
