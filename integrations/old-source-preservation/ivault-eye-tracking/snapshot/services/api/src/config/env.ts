import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WORKER_API_SECRET: z.string().min(1),
  /** Optional shared secret for local emergency / legacy tooling only — not used for admin HTTP routes. */
  ADMIN_API_SECRET: z.string().optional(),
  /** Secret for `/v1/cron/alphabet/*` — when unset, cron routes reject all requests. */
  CRON_SECRET: z.string().min(1).optional()
});

export const env = envSchema.parse(process.env);
