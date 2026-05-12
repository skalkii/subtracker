import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  APP_PASSWORD: z.string().min(1, "APP_PASSWORD is required"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function loadEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables. Copy .env.example to .env.local and fill in:\n${issues}`
    );
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof EnvSchema>;
