import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetFxCache,
  _setFxCache,
  convertCents,
  getRates,
  type RateSnapshot,
} from "./fx";

const usdSnapshot: RateSnapshot = {
  base: "USD",
  rates: { USD: 1, EUR: 0.9, GBP: 0.8, INR: 83 },
  fetchedAt: "2026-05-12T00:00:00.000Z",
  fresh: true,
};

const eurSnapshot: RateSnapshot = {
  base: "EUR",
  rates: { EUR: 1, USD: 1.1111, GBP: 0.8889 },
  fetchedAt: "2026-05-12T00:00:00.000Z",
  fresh: true,
};

describe("convertCents", () => {
  it("identity when from === to", () => {
    expect(convertCents(1000, "USD", "USD", usdSnapshot)).toBe(1000);
  });
  it("USD -> EUR using USD base", () => {
    expect(convertCents(1000, "USD", "EUR", usdSnapshot)).toBe(900);
  });
  it("INR -> USD using USD base (re-base)", () => {
    // 8300 INR / 83 = 100 USD
    expect(convertCents(8300, "INR", "USD", usdSnapshot)).toBe(100);
  });
  it("USD -> GBP using EUR base (re-base via rateFrom/rateTo)", () => {
    // 1000 USD * (0.8889 / 1.1111) ≈ 800 cents
    expect(convertCents(1000, "USD", "GBP", eurSnapshot)).toBe(800);
  });
  it("returns null if currency unknown in snapshot", () => {
    expect(convertCents(1000, "USD", "XYZ", usdSnapshot)).toBeNull();
    expect(convertCents(1000, "XYZ", "USD", usdSnapshot)).toBeNull();
  });
  it("throws on non-integer cents", () => {
    expect(() => convertCents(1.5, "USD", "EUR", usdSnapshot)).toThrow();
  });
});

describe("getRates caching", () => {
  beforeEach(() => {
    _resetFxCache();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached snapshot on second call (fresh=false)", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ base: "USD", rates: { EUR: 0.9 } }), {
          status: 200,
        })
      );
    const first = await getRates("USD");
    const second = await getRates("USD");
    expect(first.fresh).toBe(true);
    expect(second.fresh).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to cached snapshot on fetch failure (fresh=false)", async () => {
    _setFxCache("USD", { ...usdSnapshot, fresh: true }, -1); // force expired
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const r = await getRates("USD");
    expect(r.fresh).toBe(false);
    expect(r.rates.EUR).toBe(0.9);
  });

  it("throws when no cache and fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(getRates("USD")).rejects.toThrow();
  });

  it("self-rate inserted as 1", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ base: "EUR", rates: { USD: 1.1 } }), {
        status: 200,
      })
    );
    const r = await getRates("EUR");
    expect(r.rates.EUR).toBe(1);
  });
});
