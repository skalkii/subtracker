import Link from "next/link";
import { LayoutDashboard, ListIcon, Settings as SettingsIcon } from "lucide-react";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/dashboard"
            className="text-base font-semibold tracking-tight sm:text-lg"
          >
            SubTracker
          </Link>
          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <NavLink href="/dashboard" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
            <NavLink href="/subscriptions" label="Subscriptions" icon={<ListIcon className="h-4 w-4" />} />
            <NavLink href="/settings" label="Settings" icon={<SettingsIcon className="h-4 w-4" />} />
            <ThemeToggle />
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
      aria-label={label}
    >
      <span className="sm:hidden">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
