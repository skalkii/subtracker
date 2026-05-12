"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BILLING_CYCLES,
  CATEGORY_SUGGESTIONS,
  COMMON_CURRENCIES,
  SUBSCRIPTION_STATUSES,
  SubscriptionInputSchema,
  type SubscriptionInput,
  type SubscriptionInputRaw,
} from "@/lib/schemas/subscription";
import { createSubscription } from "@/server/actions/subscriptions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const cycleLabel: Record<(typeof BILLING_CYCLES)[number], string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  weekly: "Weekly",
  custom_days: "Every N days",
};

export function SubscriptionForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SubscriptionInputRaw, unknown, SubscriptionInput>({
    resolver: zodResolver(SubscriptionInputSchema),
    defaultValues: {
      name: "",
      vendor: "",
      amount: "",
      currency: "USD",
      billingCycle: "monthly",
      cycleDays: undefined,
      nextRenewalAt: plusDaysIso(30),
      startedAt: todayIso(),
      status: "active",
      category: "tools",
      notes: "",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const billingCycle = watch("billingCycle");
  const currency = watch("currency");
  const status = watch("status");

  async function onSubmit(values: SubscriptionInput) {
    setServerError(null);
    const result = await createSubscription(values);
    if (result.ok) {
      router.push("/subscriptions");
      router.refresh();
      return;
    }
    setServerError(result.error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoFocus placeholder="Vercel Pro" {...register("name")} />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" placeholder="Vercel" {...register("vendor")} />
          {errors.vendor ? (
            <p className="text-sm text-destructive">{errors.vendor.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="20.00"
            {...register("amount")}
          />
          {errors.amount ? (
            <p className="text-sm text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currency ? (
            <p className="text-sm text-destructive">{errors.currency.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="billingCycle">Billing cycle</Label>
          <Select
            value={billingCycle}
            onValueChange={(v) =>
              setValue("billingCycle", v as (typeof BILLING_CYCLES)[number], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="billingCycle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_CYCLES.map((c) => (
                <SelectItem key={c} value={c}>
                  {cycleLabel[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {billingCycle === "custom_days" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="cycleDays">Cycle days</Label>
            <Input
              id="cycleDays"
              type="number"
              min={1}
              max={3650}
              placeholder="30"
              {...register("cycleDays")}
            />
            {errors.cycleDays ? (
              <p className="text-sm text-destructive">{errors.cycleDays.message}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="startedAt">Started</Label>
          <Input id="startedAt" type="date" {...register("startedAt")} />
          {errors.startedAt ? (
            <p className="text-sm text-destructive">{errors.startedAt.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="nextRenewalAt">Next renewal</Label>
          <Input id="nextRenewalAt" type="date" {...register("nextRenewalAt")} />
          {errors.nextRenewalAt ? (
            <p className="text-sm text-destructive">{errors.nextRenewalAt.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            list="category-suggestions"
            placeholder="infra"
            {...register("category")}
          />
          <datalist id="category-suggestions">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category ? (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) =>
              setValue("status", v as (typeof SUBSCRIPTION_STATUSES)[number], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBSCRIPTION_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Optional"
          {...register("notes")}
        />
        {errors.notes ? (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        ) : null}
      </div>

      {serverError ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/subscriptions")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Add subscription"}
        </Button>
      </div>
    </form>
  );
}
