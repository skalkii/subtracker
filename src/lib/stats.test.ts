import { describe, expect, it } from "vitest";
import {
  categoryBreakdown,
  countByStatus,
  normalizeToMonthlyCents,
  normalizeToYearlyCents,
  totalsByCurrency,
  upcomingWithinDays,
  type SubLike,
} from "./stats";

function sub(partial: Partial<SubLike> = {}): SubLike {
  return {
    amountCents: 1000,
    currency: "USD",
    billingCycle: "monthly",
    cycleDays: null,
    status: "active",
    nextRenewalAt: new Date("2026-05-15T00:00:00Z"),
    category: "tools",
    ...partial,
  };
}

describe("normalize", () => {
  it("monthly -> monthly is identity", () => {
    expect(normalizeToMonthlyCents(2000, "monthly", null)).toBe(2000);
  });
  it("yearly -> monthly = /12", () => {
    expect(normalizeToMonthlyCents(1200, "yearly", null)).toBeCloseTo(100);
  });
  it("weekly -> monthly approx *4.345", () => {
    const v = normalizeToMonthlyCents(100, "weekly", null);
    expect(v).toBeGreaterThan(430);
    expect(v).toBeLessThan(436);
  });
  it("custom_days 90 -> monthly approx /3", () => {
    const v = normalizeToMonthlyCents(900, "custom_days", 90);
    expect(v).toBeGreaterThan(300);
    expect(v).toBeLessThan(305);
  });
  it("yearly -> yearly identity", () => {
    expect(normalizeToYearlyCents(1200, "yearly", null)).toBe(1200);
  });
  it("monthly -> yearly = *12", () => {
    expect(normalizeToYearlyCents(2000, "monthly", null)).toBe(24000);
  });
  it("custom_days with null cycleDays returns 0", () => {
    expect(normalizeToMonthlyCents(1000, "custom_days", null)).toBe(0);
    expect(normalizeToYearlyCents(1000, "custom_days", null)).toBe(0);
  });
});

describe("totalsByCurrency", () => {
  it("groups by currency, excludes paused/canceled", () => {
    const subs = [
      sub({ amountCents: 2000, currency: "USD", billingCycle: "monthly" }),
      sub({ amountCents: 12000, currency: "USD", billingCycle: "yearly" }),
      sub({ amountCents: 500, currency: "EUR", billingCycle: "monthly" }),
      sub({ amountCents: 9999, currency: "USD", status: "paused" }),
      sub({ amountCents: 9999, currency: "USD", status: "canceled" }),
    ];
    const totals = totalsByCurrency(subs);
    expect(totals).toHaveLength(2);
    const usd = totals.find((t) => t.currency === "USD");
    const eur = totals.find((t) => t.currency === "EUR");
    expect(usd?.monthlyCents).toBe(3000); // 2000 + 12000/12
    expect(usd?.yearlyCents).toBe(36000); // 24000 + 12000
    expect(eur?.monthlyCents).toBe(500);
    expect(eur?.yearlyCents).toBe(6000);
  });
  it("sorts highest yearly first", () => {
    const subs = [
      sub({ amountCents: 100, currency: "EUR" }),
      sub({ amountCents: 9999, currency: "USD" }),
    ];
    expect(totalsByCurrency(subs)[0]?.currency).toBe("USD");
  });
  it("returns empty array for no active subs", () => {
    expect(totalsByCurrency([sub({ status: "paused" })])).toEqual([]);
  });
});

describe("countByStatus", () => {
  it("tallies each status", () => {
    const subs = [
      sub({ status: "active" }),
      sub({ status: "active" }),
      sub({ status: "paused" }),
      sub({ status: "canceled" }),
    ];
    expect(countByStatus(subs)).toEqual({ active: 2, paused: 1, canceled: 1 });
  });
});

describe("upcomingWithinDays", () => {
  const from = new Date("2026-05-12T00:00:00Z");
  it("includes subs renewing within window", () => {
    const subs = [
      sub({ nextRenewalAt: new Date("2026-05-12T12:00:00Z") }), // today
      sub({ nextRenewalAt: new Date("2026-05-18T00:00:00Z") }), // in 6d
      sub({ nextRenewalAt: new Date("2026-05-20T00:00:00Z") }), // in 8d
    ];
    const within7 = upcomingWithinDays(subs, 7, from);
    expect(within7).toHaveLength(2);
  });
  it("excludes paused subs", () => {
    const subs = [
      sub({ nextRenewalAt: new Date("2026-05-13T00:00:00Z"), status: "paused" }),
    ];
    expect(upcomingWithinDays(subs, 7, from)).toHaveLength(0);
  });
  it("excludes past-due subs", () => {
    const subs = [sub({ nextRenewalAt: new Date("2026-05-10T00:00:00Z") })];
    expect(upcomingWithinDays(subs, 7, from)).toHaveLength(0);
  });
});

describe("categoryBreakdown", () => {
  it("aggregates monthly cents by category for a single currency", () => {
    const subs = [
      sub({ amountCents: 2000, category: "infra", currency: "USD" }),
      sub({ amountCents: 1000, category: "infra", currency: "USD" }),
      sub({ amountCents: 12000, category: "ai", billingCycle: "yearly", currency: "USD" }),
      sub({ amountCents: 9999, category: "ai", currency: "EUR" }), // wrong currency, excluded
    ];
    const out = categoryBreakdown(subs, "USD");
    expect(out).toHaveLength(2);
    const infra = out.find((c) => c.category === "infra");
    const ai = out.find((c) => c.category === "ai");
    expect(infra?.monthlyCents).toBe(3000);
    expect(infra?.count).toBe(2);
    expect(ai?.monthlyCents).toBe(1000);
    expect(ai?.count).toBe(1);
  });
});
