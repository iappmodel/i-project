/**
 * Lightweight backend readiness snapshot (no network unless Supabase client exists).
 */

import { getSupabaseClient } from "../../../lib/supabase/supabaseClient";
import { STUDIO_MIGRATION_FILES } from "./studioMigrationFiles";
import type { StudioBackendConfig } from "./studioBackendConfig";
import { effectivePersistenceMode } from "./studioBackendConfig";
import { resolveBackendMode } from "./studioBackendMode";

export interface StudioBackendHealthSnapshot {
  mode: ReturnType<typeof resolveBackendMode>;
  supabaseConfigured: boolean;
  clientAvailable: boolean;
  migrationsKnown: boolean;
  edgeFunctionsConfigured: boolean;
  warnings: string[];
  errors: string[];
  recommendedNextAction: string;
}

export function checkBackendHealth(config: StudioBackendConfig): StudioBackendHealthSnapshot {
  const warnings: string[] = [];
  const errors: string[] = [];
  for (const w of config.envWarnings) warnings.push(`[${w.code}] ${w.message}`);

  const client = getSupabaseClient();
  const clientAvailable = client != null;
  const mode = resolveBackendMode({
    mode: config.mode,
    supabaseConfigured: config.supabaseConfigured,
    enablePersistence: config.enablePersistence,
  });

  if (config.mode === "supabase" && !config.supabaseConfigured) {
    warnings.push("Supabase mode requested but credentials missing — using mock persistence.");
  }
  if (config.strictBackendMode && !clientAvailable) {
    errors.push("Strict backend enabled but Supabase client is unavailable.");
  }

  let recommendedNextAction =
    mode === "supabase"
      ? "Run migrations (`supabase db push`) and verify RLS + Edge Functions before enabling server ledger."
      : "Set VITE_STUDIO_BACKEND_MODE=supabase with URL/anon key when ready; keep mock for local UI.";

  if (clientAvailable && effectivePersistenceMode(config) === "supabase") {
    recommendedNextAction = "Optional: call `supabase.functions.list` from CI to verify deployed Edge Functions (not run from app).";
  }

  return {
    mode,
    supabaseConfigured: config.supabaseConfigured,
    clientAvailable,
    migrationsKnown: STUDIO_MIGRATION_FILES.length > 0,
    edgeFunctionsConfigured: config.enableEdgeFunctions && clientAvailable,
    warnings,
    errors,
    recommendedNextAction,
  };
}
