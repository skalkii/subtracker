/**
 * Single-password auth: signed cookie via HMAC-SHA256.
 *
 * Token format: `<base64url(payload)>.<base64url(sig)>`
 *   payload: JSON `{ exp: number }` — unix seconds
 *   sig:     HMAC-SHA256(payload, AUTH_SECRET)
 *
 * Edge-runtime safe: uses Web Crypto only (no node:crypto).
 */

import { env } from "./env";

export const AUTH_COOKIE = "auth";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type Payload = { exp: number };

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: string): Promise<string> {
  const key = await importKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return b64urlEncode(new Uint8Array(sig));
}

/** Build a signed auth token valid for AUTH_COOKIE_MAX_AGE_SECONDS. */
export async function issueToken(): Promise<string> {
  const payload: Payload = {
    exp: Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE_SECONDS,
  };
  const encodedPayload = b64urlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const sig = await sign(encodedPayload);
  return `${encodedPayload}.${sig}`;
}

/** Constant-time byte comparison. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    diff |= av ^ bv;
  }
  return diff === 0;
}

/** Verify a token signature + expiry. Returns true if valid. */
export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const encodedPayload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = await sign(encodedPayload);
  const ok = timingSafeEqual(
    new TextEncoder().encode(providedSig),
    new TextEncoder().encode(expectedSig)
  );
  if (!ok) return false;
  try {
    const payloadJson = new TextDecoder().decode(b64urlDecode(encodedPayload));
    const parsed = JSON.parse(payloadJson) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("exp" in parsed) ||
      typeof (parsed as { exp: unknown }).exp !== "number"
    ) {
      return false;
    }
    const exp = (parsed as Payload).exp;
    return exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

/** Constant-time password comparison. */
export function passwordsMatch(provided: string, expected: string): boolean {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  return timingSafeEqual(a, b);
}
