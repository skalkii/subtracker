import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import type { SubscriptionFormDefaults } from "@/components/subscriptions/form-defaults";
import {
  updateSubscription,
  type ActionResult,
} from "@/server/actions/subscriptions";
import { centsToDecimalString } from "@/lib/money";
import type { SubscriptionInput } from "@/lib/schemas/subscription";

export const metadata = { title: "Edit subscription — SubTracker" };
export const dynamic = "force-dynamic";

function rowToDefaults(row: typeof subscriptions.$inferSelect): SubscriptionFormDefaults {
  return {
    name: row.name,
    vendor: row.vendor,
    amount: centsToDecimalString(row.amountCents),
    currency: row.currency,
    billingCycle: row.billingCycle,
    cycleDays: row.cycleDays === null ? undefined : row.cycleDays,
    nextRenewalAt: row.nextRenewalAt.toISOString().slice(0, 10),
    startedAt:
      typeof row.startedAt === "string"
        ? row.startedAt
        : new Date(row.startedAt).toISOString().slice(0, 10),
    status: row.status,
    category: row.category,
    notes: row.notes ?? "",
  };
}

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, id))
    .limit(1);

  if (!row) notFound();

  async function action(input: SubscriptionInput): Promise<ActionResult<{ id: string }>> {
    "use server";
    return updateSubscription(id, input);
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/subscriptions" className="hover:underline">
            ← All subscriptions
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{row.name}</h1>
        <p className="text-sm text-muted-foreground">{row.vendor}</p>
      </header>
      <SubscriptionForm
        defaults={rowToDefaults(row)}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        action={action}
      />
    </section>
  );
}
