import { getSettings } from "@/server/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings — SubTracker" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          App-wide preferences. Stored locally; no third-party sync.
        </p>
      </header>
      <SettingsForm initialDisplayCurrency={settings.displayCurrency} />
    </section>
  );
}
