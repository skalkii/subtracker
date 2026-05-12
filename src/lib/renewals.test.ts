import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  advanceOneCycle,
  computeNextRenewal,
} from "./renewals";

function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

describe("addDays / addWeeks", () => {
  it("addDays moves forward", () => {
    expect(addDays(utc("2026-01-01"), 5).toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });
  it("addWeeks adds 7 days * n", () => {
    expect(addWeeks(utc("2026-01-01"), 2).toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });
  it("addDays handles negative", () => {
    expect(addDays(utc("2026-01-05"), -3).toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("addMonths day-clamping", () => {
  it("Jan 31 + 1 month = Feb 28 (non-leap)", () => {
    expect(addMonths(utc("2026-01-31"), 1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
  it("Jan 31 + 1 month = Feb 29 (leap year 2028)", () => {
    expect(addMonths(utc("2028-01-31"), 1).toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });
  it("Mar 31 + 1 month = Apr 30", () => {
    expect(addMonths(utc("2026-03-31"), 1).toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });
  it("Aug 15 + 6 months = Feb 15 next year", () => {
    expect(addMonths(utc("2026-08-15"), 6).toISOString()).toBe("2027-02-15T00:00:00.000Z");
  });
  it("rolls year correctly at Dec + 1", () => {
    expect(addMonths(utc("2026-12-15"), 1).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
  it("Dec 31 + 14 months = Feb 28 two years later (non-leap)", () => {
    expect(addMonths(utc("2025-12-31"), 14).toISOString()).toBe("2027-02-28T00:00:00.000Z");
  });
});

describe("addYears", () => {
  it("Feb 29 leap + 1 year = Feb 28", () => {
    expect(addYears(utc("2028-02-29"), 1).toISOString()).toBe("2029-02-28T00:00:00.000Z");
  });
  it("Feb 29 leap + 4 years = Feb 29 next leap", () => {
    expect(addYears(utc("2028-02-29"), 4).toISOString()).toBe("2032-02-29T00:00:00.000Z");
  });
  it("plain year add", () => {
    expect(addYears(utc("2026-05-15"), 2).toISOString()).toBe("2028-05-15T00:00:00.000Z");
  });
});

describe("advanceOneCycle", () => {
  it("weekly = +7 days", () => {
    expect(advanceOneCycle(utc("2026-05-12"), "weekly", null).toISOString()).toBe(
      "2026-05-19T00:00:00.000Z"
    );
  });
  it("monthly = +1 month with clamp", () => {
    expect(advanceOneCycle(utc("2026-01-31"), "monthly", null).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z"
    );
  });
  it("yearly = +1 year", () => {
    expect(advanceOneCycle(utc("2026-05-12"), "yearly", null).toISOString()).toBe(
      "2027-05-12T00:00:00.000Z"
    );
  });
  it("custom_days = +N days", () => {
    expect(advanceOneCycle(utc("2026-05-12"), "custom_days", 45).toISOString()).toBe(
      "2026-06-26T00:00:00.000Z"
    );
  });
  it("custom_days throws on null cycleDays", () => {
    expect(() => advanceOneCycle(utc("2026-05-12"), "custom_days", null)).toThrow();
  });
  it("custom_days throws on zero", () => {
    expect(() => advanceOneCycle(utc("2026-05-12"), "custom_days", 0)).toThrow();
  });
});

describe("computeNextRenewal", () => {
  it("monthly: started a year ago, advances until past today", () => {
    const from = utc("2026-05-12");
    const next = computeNextRenewal(utc("2025-05-15"), "monthly", null, from);
    expect(next.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });
  it("yearly: started two years ago, next renewal is next year", () => {
    const from = utc("2026-05-12");
    const next = computeNextRenewal(utc("2024-08-01"), "yearly", null, from);
    expect(next.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
  it("weekly: started 3 weeks ago, advances to next future Friday", () => {
    const from = utc("2026-05-12"); // Tuesday
    const next = computeNextRenewal(utc("2026-04-17"), "weekly", null, from); // Friday
    expect(next.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });
  it("monthly: Jan 31 start, current Feb 15, next renewal Feb 28", () => {
    const from = utc("2026-02-15");
    const next = computeNextRenewal(utc("2026-01-31"), "monthly", null, from);
    expect(next.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
  it("custom_days: 90-day cycle", () => {
    const from = utc("2026-05-12");
    const next = computeNextRenewal(utc("2026-01-01"), "custom_days", 90, from);
    expect(next.toISOString()).toBe("2026-06-30T00:00:00.000Z");
  });
  it("started exactly today still advances one cycle", () => {
    const today = utc("2026-05-12");
    const next = computeNextRenewal(today, "monthly", null, today);
    expect(next.toISOString()).toBe("2026-06-12T00:00:00.000Z");
  });
  it("started in the future returns the start date itself", () => {
    const from = utc("2026-05-12");
    const next = computeNextRenewal(utc("2026-06-01"), "monthly", null, from);
    expect(next.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
  it("accepts startedAt as YYYY-MM-DD string", () => {
    const from = utc("2026-05-12");
    const next = computeNextRenewal("2026-01-10", "monthly", null, from);
    expect(next.toISOString()).toBe("2026-06-10T00:00:00.000Z");
  });
});
