import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { subscriptions, type NewSubscription } from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const examples: NewSubscription[] = [
  {
    name: "Vercel Pro",
    vendor: "Vercel",
    amountCents: 2000,
    currency: "USD",
    billingCycle: "monthly",
    nextRenewalAt: daysFromNow(12),
    startedAt: today(),
    status: "active",
    category: "infra",
    notes: null,
  },
  {
    name: "GitHub Pro",
    vendor: "GitHub",
    amountCents: 400,
    currency: "USD",
    billingCycle: "monthly",
    nextRenewalAt: daysFromNow(3),
    startedAt: today(),
    status: "active",
    category: "tools",
    notes: null,
  },
  {
    name: "example.com domain",
    vendor: "Namecheap",
    amountCents: 1099,
    currency: "USD",
    billingCycle: "yearly",
    nextRenewalAt: daysFromNow(180),
    startedAt: today(),
    status: "active",
    category: "domains",
    notes: "auto-renew enabled",
  },
];

async function main() {
  const existing = await db.select({ id: subscriptions.id }).from(subscriptions).limit(1);
  if (existing.length > 0) {
    console.log("seed: subscriptions table already has rows, skipping");
    return;
  }
  const inserted = await db.insert(subscriptions).values(examples).returning({ id: subscriptions.id });
  console.log(`seed: inserted ${inserted.length} subscriptions`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
