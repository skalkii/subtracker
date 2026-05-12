export const metadata = { title: "Dashboard — SubTracker" };

export default function DashboardPage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Stats, upcoming renewals, and category breakdown land here in the dashboard slice.
      </p>
    </section>
  );
}
