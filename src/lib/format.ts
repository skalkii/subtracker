/** Display formatters: dates, cycles. */

const DAY_MS = 86_400_000;

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRelativeDays(d: Date | string, from: Date = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const startTarget = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const startFrom = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const diff = Math.round((startTarget - startFrom) / DAY_MS);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 1) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export function formatBillingCycle(
  cycle: "monthly" | "yearly" | "weekly" | "custom_days",
  cycleDays: number | null
): string {
  switch (cycle) {
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    case "weekly":
      return "Weekly";
    case "custom_days":
      return cycleDays ? `Every ${cycleDays} days` : "Custom";
  }
}
