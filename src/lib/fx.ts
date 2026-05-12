/**
 * FX rate fetching + caching.
 *
 * - Source: exchangerate.host (free, no key).
 * - Cache: in-memory, 24h TTL.
 * - Offline fallback: if fetch fails and we have a previous cached snapshot,
 *   we return it (with the original `fetchedAt`) so the UI can show "rates from <date>".
 *
 * Conversion is exposed as a pure function `convertCents` so unit tests
 * don't need network.
 */

const TTL_MS = 24 * 60 * 60 * 1000;
const ENDPOINT = "https://api.exchangerate.host/latest";

export type RateSnapshot = {
  /** Base currency of the rates map. */
  base: string;
  /** Map of ISO code -> rate relative to base. base->base = 1. */
  rates: Record<string, number>;
  /** ISO timestamp when the snapshot was fetched. */
  fetchedAt: string;
  /** True when this snapshot came from the live API in this request path. */
  fresh: boolean;
};

type CacheEntry = { snapshot: RateSnapshot; expiresAt: number };

const cache = new Map<string, CacheEntry>();

/** Reset all cached snapshots. Intended for tests. */
export function _resetFxCache(): void {
  cache.clear();
}

/** Inject a snapshot for tests. */
export function _setFxCache(base: string, snapshot: RateSnapshot, ttlMs: number = TTL_MS): void {
  cache.set(base.toUpperCase(), { snapshot, expiresAt: Date.now() + ttlMs });
}

/**
 * Fetch (or return cached) FX rates for the given base currency.
 *
 * Behavior:
 * - Cache hit + not expired -> return cached, marked fresh=false (still good).
 * - Cache miss or expired   -> hit API. On success, update cache and return fresh=true.
 * - On API error            -> return last cached snapshot if any, fresh=false.
 *                             If no cache at all, throw.
 */
export async function getRates(base: string): Promise<RateSnapshot> {
  const key = base.toUpperCase();
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return { ...cached.snapshot, fresh: false };
  }

  try {
    const url = `${ENDPOINT}?base=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`exchangerate.host ${res.status}`);
    const data = (await res.json()) as { base?: string; rates?: Record<string, number> };
    if (!data.rates || typeof data.rates !== "object") {
      throw new Error("exchangerate.host: missing rates");
    }
    const snapshot: RateSnapshot = {
      base: key,
      rates: { ...data.rates, [key]: 1 },
      fetchedAt: new Date().toISOString(),
      fresh: true,
    };
    cache.set(key, { snapshot, expiresAt: now + TTL_MS });
    return snapshot;
  } catch (err) {
    if (cached) {
      return { ...cached.snapshot, fresh: false };
    }
    throw err instanceof Error ? err : new Error("FX fetch failed");
  }
}

/**
 * Convert integer cents from one currency to another using a rate snapshot.
 *
 * The snapshot is expressed relative to `snapshot.base`. So to convert
 * USD->EUR using snapshot(base=USD), result = cents * snapshot.rates['EUR'].
 *
 * If snapshot.base !== from, we re-base via:
 *    rate(from -> to) = rate(base -> to) / rate(base -> from)
 *
 * Rounds to the nearest integer cent (banker's-free: regular Math.round).
 * Returns null if either currency is missing from the snapshot.
 */
export function convertCents(
  cents: number,
  from: string,
  to: string,
  snapshot: RateSnapshot
): number | null {
  if (!Number.isInteger(cents)) {
    throw new Error("convertCents: cents must be an integer");
  }
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return cents;
  const rateFrom = snapshot.rates[f];
  const rateTo = snapshot.rates[t];
  if (typeof rateFrom !== "number" || typeof rateTo !== "number") return null;
  if (rateFrom === 0) return null;
  return Math.round((cents * rateTo) / rateFrom);
}
