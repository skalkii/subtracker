import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/lib/money";
import { formatBillingCycle, formatDate, formatRelativeDays } from "@/lib/format";

export const metadata = { title: "Subscriptions — SubTracker" };
export const dynamic = "force-dynamic";

function statusVariant(
  status: "active" | "canceled" | "paused"
): "default" | "secondary" | "outline" {
  if (status === "active") return "default";
  if (status === "paused") return "secondary";
  return "outline";
}

export default async function SubscriptionsPage() {
  const rows = await db
    .select()
    .from(subscriptions)
    .orderBy(asc(subscriptions.nextRenewalAt));

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "subscription" : "subscriptions"} tracked
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <p className="text-base font-medium">No subscriptions yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first subscription to start tracking burn.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Next renewal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.vendor}</span>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCents(s.amountCents, s.currency)}
                  </TableCell>
                  <TableCell>{formatBillingCycle(s.billingCycle, s.cycleDays)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{formatDate(s.nextRenewalAt)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDays(s.nextRenewalAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(s.status)} className="capitalize">
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {s.category}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
