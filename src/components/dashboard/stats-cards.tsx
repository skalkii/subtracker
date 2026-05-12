import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import type { CurrencyTotal } from "@/lib/stats";

type Props = {
  totals: CurrencyTotal[];
  activeCount: number;
  upcoming7: number;
  upcoming30: number;
};

export function StatsCards({ totals, activeCount, upcoming7, upcoming30 }: Props) {
  const primary = totals[0];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly burn
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {primary ? (
            <span className="text-2xl font-semibold tabular-nums">
              {formatCents(primary.monthlyCents, primary.currency)}
            </span>
          ) : (
            <span className="text-2xl font-semibold text-muted-foreground">—</span>
          )}
          {totals.length > 1 ? (
            <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground tabular-nums">
              {totals.slice(1).map((t) => (
                <li key={t.currency}>
                  + {formatCents(t.monthlyCents, t.currency)}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Yearly burn
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {primary ? (
            <span className="text-2xl font-semibold tabular-nums">
              {formatCents(primary.yearlyCents, primary.currency)}
            </span>
          ) : (
            <span className="text-2xl font-semibold text-muted-foreground">—</span>
          )}
          {totals.length > 1 ? (
            <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground tabular-nums">
              {totals.slice(1).map((t) => (
                <li key={t.currency}>
                  + {formatCents(t.yearlyCents, t.currency)}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="text-2xl font-semibold tabular-nums">{activeCount}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Renewing soon
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <span className="text-2xl font-semibold tabular-nums">{upcoming7}</span>
          <span className="text-xs text-muted-foreground">
            in next 7 days · {upcoming30} in 30
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
