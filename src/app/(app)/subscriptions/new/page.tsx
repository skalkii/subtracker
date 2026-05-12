import Link from "next/link";
import {
  SubscriptionForm,
  defaultsForCreate,
} from "@/components/subscriptions/subscription-form";
import { createSubscription } from "@/server/actions/subscriptions";

export const metadata = { title: "New subscription — SubTracker" };

export default function NewSubscriptionPage() {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/subscriptions" className="hover:underline">
            ← All subscriptions
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">New subscription</h1>
      </header>
      <SubscriptionForm
        defaults={defaultsForCreate()}
        submitLabel="Add subscription"
        pendingLabel="Saving…"
        action={createSubscription}
      />
    </section>
  );
}
