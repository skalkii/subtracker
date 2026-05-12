import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — SubTracker" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">SubTracker</h1>
          <p className="text-sm text-muted-foreground">
            Enter the app password to continue.
          </p>
        </header>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
