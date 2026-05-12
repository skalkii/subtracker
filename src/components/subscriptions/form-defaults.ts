import type { SubscriptionInputRaw } from "@/lib/schemas/subscription";

export type SubscriptionFormDefaults = SubscriptionInputRaw;

export function defaultsForCreate(): SubscriptionFormDefaults {
  const today = new Date().toISOString().slice(0, 10);
  const renewal = new Date();
  renewal.setUTCDate(renewal.getUTCDate() + 30);
  return {
    name: "",
    vendor: "",
    amount: "",
    currency: "USD",
    billingCycle: "monthly",
    cycleDays: undefined,
    nextRenewalAt: renewal.toISOString().slice(0, 10),
    startedAt: today,
    status: "active",
    category: "tools",
    notes: "",
  };
}
