import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { formatDate, formatRelativeDays } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  vendor: string;
  amountCents: number;
  currency: string;
  nextRenewalAt: Date;
};

export function UpcomingRenewals({
  rows,
  windowDays,
}: {
  rows: Row[];
  windowDays: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming renewals · next {windowDays} days</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No renewals due in the next {windowDays} days.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <Link href={`/subscriptions/${r.id}`} className="flex flex-col hover:underline">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.vendor}</span>
                </Link>
                <div className="flex flex-col items-end">
                  <span className="font-medium tabular-nums">
                    {formatCents(r.amountCents, r.currency)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.nextRenewalAt)} · {formatRelativeDays(r.nextRenewalAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
