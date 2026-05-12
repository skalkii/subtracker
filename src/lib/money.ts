/**
 * Money helpers. Integer cents only. Never use floats for currency.
 *
 * - `formatCents(cents, currency)` -> localized display ("$20.00", "€1,099.00").
 * - `parseAmountToCents(input)` parses user input ("19.99", "1,099") to integer cents.
 *
 * Display: Intl.NumberFormat with `style: "currency"`. Never `toFixed`.
 */

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, locale = "en-US"): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const f = new Intl.NumberFormat(locale, { style: "currency", currency });
  formatterCache.set(key, f);
  return f;
}

/** Format integer cents in the given ISO 4217 currency. */
export function formatCents(cents: number, currency: string, locale?: string): string {
  if (!Number.isFinite(cents)) throw new Error("formatCents: cents must be finite");
  if (!Number.isInteger(cents)) throw new Error("formatCents: cents must be an integer");
  // Divide only inside Intl which expects a number; the formatter handles minor unit math itself.
  return getFormatter(currency, locale).format(cents / 100);
}

/**
 * Plain decimal string for populating form inputs from cents (no currency symbol).
 * E.g. 2000 -> "20.00", 1099 -> "10.99". Use for form defaults, not display.
 */
export function centsToDecimalString(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("centsToDecimalString: cents must be an integer");
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100);
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

/**
 * Parse a user-entered amount string into integer cents.
 * Accepts: "1999", "19.99", "1,099.00", " 1 099,99 " (loose).
 * Returns null on invalid input. Does no rounding beyond truncating fractional digits past 2.
 */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  // Strip thousands separators (spaces, commas not used as decimal). Normalize comma decimals.
  // Heuristic: last separator that has 1-2 digits after it is the decimal mark.
  const lastDot = trimmed.lastIndexOf(".");
  const lastComma = trimmed.lastIndexOf(",");
  let normalized = trimmed.replace(/\s+/g, "");
  if (lastDot >= 0 && lastComma >= 0) {
    // Whichever appears later is decimal.
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = normalized.replace(/,/g, "");
    }
  } else if (lastComma >= 0 && lastDot < 0) {
    // Treat lone comma as decimal only if followed by 1-2 digits, else thousands.
    const after = normalized.length - lastComma - 1;
    normalized = after <= 2 ? normalized.replace(",", ".") : normalized.replace(/,/g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const [whole, frac = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isFinite(cents)) return null;
  return whole?.startsWith("-") ? -cents : cents;
}
