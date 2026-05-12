import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings, type Settings } from "@/db/schema";

/**
 * Loads the singleton settings row, inserting it on first access.
 * Always returns id=1.
 */
export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (row) return row;
  const [inserted] = await db
    .insert(settings)
    .values({ id: 1, displayCurrency: null })
    .returning();
  if (!inserted) throw new Error("Failed to initialize settings row");
  return inserted;
}
