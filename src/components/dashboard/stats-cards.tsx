import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import type { CurrencyTotal } from "@/lib/stats";
import type { ConvertedTotals } from "@/lib/stats-fx";

type SharedProps = {
  activeCount: number;
  upcoming7: number;
  upcoming30: number;
};

type UnconvertedProps = SharedProps & {
  mode: "per-currency";
  totals: CurrencyTotal[];
};

type ConvertedProps = SharedProps & {
  mode: "converted";
  displayCurrency: string;
  converted: ConvertedTotals;
};

type Props = UnconvertedProps | ConvertedProps;

function CountCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
      </CardContent>
    </Card>
  );
}

export function StatsCards(props: Props) {
  const renewSub = `in next 7 days · ${props.upcoming30} in 30`;

  if (props.mode === "converted") {
    const { converted, displayCurrency } = props;
    const monthly = formatCents(converted.monthlyCents, displayCurrency);
    const yearly = formatCents(converted.yearlyCents, displayCurrency);

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyCard label="Monthly burn" headline={monthly} unconverted={converted.unconverted.map((u) => formatCents(u.monthlyCents, u.currency))} />
        <MoneyCard label="Yearly burn" headline={yearly} unconverted={converted.unconverted.map((u) => formatCents(u.yearlyCents, u.currency))} />
        <CountCard label="Active subscriptions" value={String(props.activeCount)} />
        <CountCard label="Renewing soon" value={String(props.upcoming7)} sub={renewSub} />
      </div>
    );
  }

  const primary = props.totals[0];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MoneyCard
        label="Monthly burn"
        headline={primary ? formatCents(primary.monthlyCents, primary.currency) : "—"}
        unconverted={props.totals.slice(1).map((t) => formatCents(t.monthlyCents, t.currency))}
      />
      <MoneyCard
        label="Yearly burn"
        headline={primary ? formatCents(primary.yearlyCents, primary.currency) : "—"}
        unconverted={props.totals.slice(1).map((t) => formatCents(t.yearlyCents, t.currency))}
      />
      <CountCard label="Active subscriptions" value={String(props.activeCount)} />
      <CountCard label="Renewing soon" value={String(props.upcoming7)} sub={renewSub} />
    </div>
  );
}

function MoneyCard({
  label,
  headline,
  unconverted,
}: {
  label: string;
  headline: string;
  unconverted: string[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-2xl font-semibold tabular-nums">{headline}</span>
        {unconverted.length > 0 ? (
          <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground tabular-nums">
            {unconverted.map((s, i) => (
              <li key={i}>+ {s}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
