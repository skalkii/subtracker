"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console; in production we'd ship to an error tracker.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Unexpected error rendering this page."}
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">digest: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
