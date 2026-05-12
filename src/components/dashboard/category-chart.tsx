"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import type { CategorySlice } from "@/lib/stats";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#a855f7",
  "#dc2626",
  "#0891b2",
  "#ca8a04",
  "#475569",
];

export function CategoryChart({
  slices,
  currency,
}: {
  slices: CategorySlice[];
  currency: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category breakdown · monthly</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active subscriptions in {currency}.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_minmax(0,180px)]">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="monthlyCents"
                    nameKey="category"
                    innerRadius={40}
                    outerRadius={90}
                    strokeWidth={1}
                  >
                    {slices.map((s, i) => (
                      <Cell key={s.category} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      typeof value === "number" ? formatCents(value, currency) : String(value),
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {slices.map((s, i) => (
                <li key={s.category} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 capitalize">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                    />
                    {s.category}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatCents(s.monthlyCents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
