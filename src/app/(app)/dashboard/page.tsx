import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { UpcomingRenewals } from "@/components/dashboard/upcoming-renewals";
import { CategoryChart } from "@/components/dashboard/category-chart";
import {
  categoryBreakdown,
  countByStatus,
  totalsByCurrency,
  upcomingWithinDays,
} from "@/lib/stats";

export const metadata = { title: "Dashboard — SubTracker" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const rows = await db
    .select()
    .from(subscriptions)
    .orderBy(asc(subscriptions.nextRenewalAt));

  const totals = totalsByCurrency(rows);
  const statusCounts = countByStatus(rows);
  const upcoming7 = upcomingWithinDays(rows, 7);
  const upcoming30 = upcomingWithinDays(rows, 30);
  const primaryCurrency = totals[0]?.currency ?? "USD";
  const slices = categoryBreakdown(rows, primaryCurrency);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of recurring spend.
          </p>
        </div>
        <Button asChild>
          <Link href="/subscriptions/new">Add subscription</Link>
        </Button>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-base font-medium">No subscriptions yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first subscription to see burn, renewals, and category mix.
            </p>
          </div>
          <Button asChild>
            <Link href="/subscriptions/new">Add the first one</Link>
          </Button>
        </div>
      ) : (
        <>
          <StatsCards
            totals={totals}
            activeCount={statusCounts.active}
            upcoming7={upcoming7.length}
            upcoming30={upcoming30.length}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <UpcomingRenewals
              rows={upcoming30.map((s) => ({
                id: s.id,
                name: s.name,
                vendor: s.vendor,
                amountCents: s.amountCents,
                currency: s.currency,
                nextRenewalAt: s.nextRenewalAt,
              }))}
              windowDays={30}
            />
            <CategoryChart slices={slices} currency={primaryCurrency} />
          </div>
        </>
      )}
    </section>
  );
}
