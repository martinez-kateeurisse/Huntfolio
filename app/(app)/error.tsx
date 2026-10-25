"use client";

import { useEffect } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown when a page's data fails to load (e.g. the database is unreachable).
// Keeps the nav usable and offers a retry instead of a blank or empty page.
export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid place-items-center rounded-xl border border-dashed bg-card/50 px-6 py-16 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <CloudOff className="size-5" />
      </div>
      <p className="font-medium">Couldn&apos;t load this page</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Your data is safe. This is usually a temporary connection problem with
        the database — try again in a moment.
      </p>
      <Button className="mt-4" onClick={() => unstable_retry()}>
        <RefreshCw className="size-4" /> Try again
      </Button>
      {error.digest && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          Ref: {error.digest}
        </p>
      )}
    </div>
  );
}
