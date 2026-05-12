import { z } from "zod";
import { parseAmountToCents } from "@/lib/money";

export const BILLING_CYCLES = ["monthly", "yearly", "weekly", "custom_days"] as const;
export const SUBSCRIPTION_STATUSES = ["active", "canceled", "paused"] as const;

/** Common ISO 4217 codes. Free-form input also allowed (any 3-letter code). */
export const COMMON_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
] as const;

export const CATEGORY_SUGGESTIONS = [
  "infra",
  "ai",
  "domains",
  "tools",
  "media",
  "other",
] as const;

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

/** Input shape coming from the form (strings everywhere; amount is a decimal string). */
export const SubscriptionInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    vendor: z.string().trim().min(1, "Vendor is required").max(200),
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required")
      .refine((s) => {
        const cents = parseAmountToCents(s);
        return cents !== null && cents > 0;
      }, "Amount must be a positive number"),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code"),
    billingCycle: z.enum(BILLING_CYCLES),
    cycleDays: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === "" || v === null) return null;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : null;
      })
      .pipe(z.number().int().min(1).max(3650).nullable()),
    nextRenewalAt: isoDateString,
    startedAt: isoDateString,
    status: z.enum(SUBSCRIPTION_STATUSES).default("active"),
    category: z.string().trim().min(1, "Category is required").max(50),
    notes: z
      .string()
      .max(1000, "Notes too long")
      .optional()
      .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  })
  .superRefine((val, ctx) => {
    if (val.billingCycle === "custom_days" && val.cycleDays === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cycleDays"],
        message: "Required when cycle is 'every N days'",
      });
    }
    if (val.billingCycle !== "custom_days" && val.cycleDays !== null) {
      // Silently null out so users can switch cycle without resetting field.
      val.cycleDays = null;
    }
  });

export type SubscriptionInput = z.infer<typeof SubscriptionInputSchema>;
