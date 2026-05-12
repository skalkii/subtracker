import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SubscriptionNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">Subscription not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been deleted, or the link is stale.
        </p>
      </div>
      <Button asChild>
        <Link href="/subscriptions">Back to subscriptions</Link>
      </Button>
    </div>
  );
}
