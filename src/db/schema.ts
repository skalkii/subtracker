import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const billingCycle = pgEnum("billing_cycle", [
  "monthly",
  "yearly",
  "weekly",
  "custom_days",
]);

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "canceled",
  "paused",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: text("name").notNull(),
    vendor: text("vendor").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    billingCycle: billingCycle("billing_cycle").notNull(),
    cycleDays: integer("cycle_days"),
    nextRenewalAt: timestamp("next_renewal_at", { withTimezone: true }).notNull(),
    startedAt: date("started_at").notNull(),
    status: subscriptionStatus("status").notNull().default("active"),
    category: text("category").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("subscriptions_next_renewal_at_idx").on(t.nextRenewalAt),
    index("subscriptions_status_idx").on(t.status),
  ]
);

export const payments = pgTable("payments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  subscriptionId: text("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/**
 * Single-row settings table. We don't allow more than one row;
 * the application reads/upserts id=1 only.
 */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  displayCurrency: text("display_currency"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Settings = typeof settings.$inferSelect;
