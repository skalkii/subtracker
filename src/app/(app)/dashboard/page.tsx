import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions, type Subscription } from "@/db/schema";
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
import { categoryBreakdownConverted, totalsInDisplayCurrency } from "@/lib/stats-fx";
import { getRates, type RateSnapshot } from "@/lib/fx";
import { formatDate } from "@/lib/format";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Dashboard — SubTracker" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [rows, settings] = await Promise.all([
    db.select().from(subscriptions).orderBy(asc(subscriptions.nextRenewalAt)),
    getSettings(),
  ]);

  const statusCounts = countByStatus(rows);
  const upcoming7 = upcomingWithinDays(rows, 7);
  const upcoming30 = upcomingWithinDays(rows, 30);

  let snapshot: RateSnapshot | null = null;
  let fxError: string | null = null;
  if (settings.displayCurrency) {
    try {
      snapshot = await getRates(settings.displayCurrency);
    } catch (err) {
      fxError = err instanceof Error ? err.message : "FX fetch failed";
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of recurring spend.
            {settings.displayCurrency && snapshot ? (
              <span className="ml-2 text-xs">
                {snapshot.fresh ? "live" : "rates from "} {formatDate(snapshot.fetchedAt)}
              </span>
            ) : null}
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
          {fxError ? (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              FX rates unavailable ({fxError}); falling back to per-currency subtotals.
            </p>
          ) : null}

          {settings.displayCurrency && snapshot ? (
            <DashboardConverted
              rows={rows}
              displayCurrency={settings.displayCurrency}
              snapshot={snapshot}
              activeCount={statusCounts.active}
              upcoming7Count={upcoming7.length}
              upcoming30={upcoming30}
            />
          ) : (
            <DashboardPerCurrency
              rows={rows}
              activeCount={statusCounts.active}
              upcoming7Count={upcoming7.length}
              upcoming30={upcoming30}
            />
          )}
        </>
      )}
    </section>
  );
}

function DashboardPerCurrency({
  rows,
  activeCount,
  upcoming7Count,
  upcoming30,
}: {
  rows: Subscription[];
  activeCount: number;
  upcoming7Count: number;
  upcoming30: Subscription[];
}) {
  const totals = totalsByCurrency(rows);
  const primary = totals[0]?.currency ?? "USD";
  const slices = categoryBreakdown(rows, primary);
  return (
    <>
      <StatsCards
        mode="per-currency"
        totals={totals}
        activeCount={activeCount}
        upcoming7={upcoming7Count}
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
            nextRenewalAt:
              typeof s.nextRenewalAt === "string"
                ? new Date(s.nextRenewalAt)
                : s.nextRenewalAt,
          }))}
          windowDays={30}
        />
        <CategoryChart slices={slices} currency={primary} />
      </div>
    </>
  );
}

function DashboardConverted({
  rows,
  displayCurrency,
  snapshot,
  activeCount,
  upcoming7Count,
  upcoming30,
}: {
  rows: Subscription[];
  displayCurrency: string;
  snapshot: RateSnapshot;
  activeCount: number;
  upcoming7Count: number;
  upcoming30: Subscription[];
}) {
  const converted = totalsInDisplayCurrency(rows, displayCurrency, snapshot);
  const slices = categoryBreakdownConverted(rows, displayCurrency, snapshot);
  return (
    <>
      <StatsCards
        mode="converted"
        displayCurrency={displayCurrency}
        converted={converted}
        activeCount={activeCount}
        upcoming7={upcoming7Count}
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
            nextRenewalAt:
              typeof s.nextRenewalAt === "string"
                ? new Date(s.nextRenewalAt)
                : s.nextRenewalAt,
          }))}
          windowDays={30}
        />
        <CategoryChart slices={slices} currency={displayCurrency} />
      </div>
    </>
  );
}
