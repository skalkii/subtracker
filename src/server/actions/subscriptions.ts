"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { subscriptions, type NewSubscription } from "@/db/schema";
import { parseAmountToCents } from "@/lib/money";
import { SubscriptionInputSchema } from "@/lib/schemas/subscription";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createSubscription(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = SubscriptionInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "input";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid input"}` };
  }

  const v = parsed.data;
  const cents = parseAmountToCents(v.amount);
  if (cents === null || cents <= 0) {
    return { ok: false, error: "amount: must be a positive number" };
  }

  const row: NewSubscription = {
    name: v.name,
    vendor: v.vendor,
    amountCents: cents,
    currency: v.currency,
    billingCycle: v.billingCycle,
    cycleDays: v.cycleDays,
    nextRenewalAt: new Date(`${v.nextRenewalAt}T00:00:00Z`),
    startedAt: v.startedAt,
    status: v.status,
    category: v.category,
    notes: v.notes,
  };

  try {
    const [inserted] = await db
      .insert(subscriptions)
      .values(row)
      .returning({ id: subscriptions.id });
    if (!inserted) return { ok: false, error: "Insert returned no row" };
    revalidatePath("/subscriptions");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: inserted.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return { ok: false, error: message };
  }
}
