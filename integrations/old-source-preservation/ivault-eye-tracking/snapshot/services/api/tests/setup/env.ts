import { config as loadDotEnv } from "dotenv";

loadDotEnv({ path: ".env.test", override: false });
loadDotEnv({ override: false });

const REQUIRED_ENV_VARS = [
  "API_BASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TEST_USER_EMAIL",
  "TEST_USER_PASSWORD",
  "TEST_USER_ID",
  "SECOND_TEST_USER_EMAIL",
  "SECOND_TEST_USER_PASSWORD",
  "SECOND_TEST_USER_ID",
  "WORKER_API_SECRET",
  "ADMIN_USER_EMAIL",
  "ADMIN_USER_PASSWORD"
] as const;

/** Local Vitest defaults when `.env.test` is missing (unit tests must not require real secrets). */
const SAFE_TEST_DEFAULTS: Record<(typeof REQUIRED_ENV_VARS)[number], string> = {
  API_BASE_URL: "http://127.0.0.1:1",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY: "vitest-anon-key-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "vitest-service-role-key-placeholder",
  TEST_USER_EMAIL: "vitest-user-1@test.local",
  TEST_USER_PASSWORD: "vitest-password-placeholder",
  TEST_USER_ID: "00000000-0000-4000-8000-000000000001",
  SECOND_TEST_USER_EMAIL: "vitest-user-2@test.local",
  SECOND_TEST_USER_PASSWORD: "vitest-password-placeholder",
  SECOND_TEST_USER_ID: "00000000-0000-4000-8000-000000000002",
  WORKER_API_SECRET: "vitest-worker-api-secret-placeholder",
  ADMIN_USER_EMAIL: "vitest-admin@test.local",
  ADMIN_USER_PASSWORD: "vitest-admin-password-placeholder"
};

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]?.trim()) {
    process.env[key] = SAFE_TEST_DEFAULTS[key];
  }
}

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key] || process.env[key]?.trim() === "") {
    throw new Error(`Missing required test env var: ${key}`);
  }
}
