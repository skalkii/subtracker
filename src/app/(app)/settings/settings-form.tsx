"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMON_CURRENCIES } from "@/lib/schemas/subscription";
import { updateSettings } from "@/server/actions/settings";

const NONE = "__none__";

export function SettingsForm({
  initialDisplayCurrency,
}: {
  initialDisplayCurrency: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<string>(initialDisplayCurrency ?? NONE);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const r = await updateSettings({
        displayCurrency: value === NONE ? null : value,
      });
      if (r.ok) {
        setStatus({ kind: "ok", msg: "Saved." });
        router.refresh();
      } else {
        setStatus({ kind: "err", msg: r.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayCurrency">Display currency</Label>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger id="displayCurrency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Per-currency subtotals (no conversion)</SelectItem>
            {COMMON_CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          When set, the dashboard converts every subscription into this currency using
          live FX rates from exchangerate.host (cached 24h).
        </p>
      </div>
      {status ? (
        <p
          className={
            status.kind === "ok"
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {status.msg}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
