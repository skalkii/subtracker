"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import type { ActionResult } from "./subscriptions";

const UpdateSettingsSchema = z.object({
  displayCurrency: z
    .union([z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/), z.literal("")])
    .nullable()
    .optional()
    .transform((v) => (v === "" || v === null || v === undefined ? null : v)),
});

export async function updateSettings(
  raw: unknown
): Promise<ActionResult<{ displayCurrency: string | null }>> {
  const parsed = UpdateSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") ?? "input";
    return { ok: false, error: `${path}: ${first?.message ?? "Invalid input"}` };
  }

  try {
    // upsert id=1
    await db
      .insert(settings)
      .values({ id: 1, displayCurrency: parsed.data.displayCurrency })
      .onConflictDoUpdate({
        target: settings.id,
        set: {
          displayCurrency: parsed.data.displayCurrency,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/dashboard");
    revalidatePath("/settings");

    const [row] = await db
      .select({ displayCurrency: settings.displayCurrency })
      .from(settings)
      .where(eq(settings.id, 1))
      .limit(1);

    return { ok: true, data: { displayCurrency: row?.displayCurrency ?? null } };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database error",
    };
  }
}
