"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h2 className="text-xl font-semibold">SubTracker crashed</h2>
          <p className="text-sm text-gray-500">
            {error.message || "Unexpected root-level error."}
          </p>
          {error.digest ? (
            <p className="text-xs text-gray-500">digest: {error.digest}</p>
          ) : null}
          <button
            onClick={reset}
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
