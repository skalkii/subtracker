"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { subscriptions, type NewSubscription } from "@/db/schema";
import { parseAmountToCents } from "@/lib/money";
import {
  SUBSCRIPTION_STATUSES,
  SubscriptionInputSchema,
} from "@/lib/schemas/subscription";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function firstIssue(error: z.ZodError): string {
  const first = error.issues[0];
  const path = first?.path.join(".") ?? "input";
  return `${path}: ${first?.message ?? "Invalid input"}`;
}

function revalidateAll() {
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

function buildRow(v: z.output<typeof SubscriptionInputSchema>): NewSubscription | string {
  const cents = parseAmountToCents(v.amount);
  if (cents === null || cents <= 0) return "amount: must be a positive number";
  return {
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
}

export async function createSubscription(
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = SubscriptionInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const row = buildRow(parsed.data);
  if (typeof row === "string") return { ok: false, error: row };

  try {
    const [inserted] = await db
      .insert(subscriptions)
      .values(row)
      .returning({ id: subscriptions.id });
    if (!inserted) return { ok: false, error: "Insert returned no row" };
    revalidateAll();
    return { ok: true, data: { id: inserted.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

const IdSchema = z.string().min(1).max(64);

export async function updateSubscription(
  id: string,
  raw: unknown
): Promise<ActionResult<{ id: string }>> {
  const idParsed = IdSchema.safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Invalid id" };

  const parsed = SubscriptionInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const row = buildRow(parsed.data);
  if (typeof row === "string") return { ok: false, error: row };

  try {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...row, updatedAt: new Date() })
      .where(eq(subscriptions.id, idParsed.data))
      .returning({ id: subscriptions.id });
    if (!updated) return { ok: false, error: "Subscription not found" };
    revalidateAll();
    return { ok: true, data: { id: updated.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function deleteSubscription(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const idParsed = IdSchema.safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Invalid id" };

  try {
    const [deleted] = await db
      .delete(subscriptions)
      .where(eq(subscriptions.id, idParsed.data))
      .returning({ id: subscriptions.id });
    if (!deleted) return { ok: false, error: "Subscription not found" };
    revalidateAll();
    return { ok: true, data: { id: deleted.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}

const StatusSchema = z.enum(SUBSCRIPTION_STATUSES);

export async function setSubscriptionStatus(
  id: string,
  status: string
): Promise<ActionResult<{ id: string; status: (typeof SUBSCRIPTION_STATUSES)[number] }>> {
  const idParsed = IdSchema.safeParse(id);
  if (!idParsed.success) return { ok: false, error: "Invalid id" };
  const statusParsed = StatusSchema.safeParse(status);
  if (!statusParsed.success) return { ok: false, error: "Invalid status" };

  try {
    const [updated] = await db
      .update(subscriptions)
      .set({ status: statusParsed.data, updatedAt: new Date() })
      .where(eq(subscriptions.id, idParsed.data))
      .returning({ id: subscriptions.id, status: subscriptions.status });
    if (!updated) return { ok: false, error: "Subscription not found" };
    revalidateAll();
    return { ok: true, data: updated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Database error" };
  }
}
