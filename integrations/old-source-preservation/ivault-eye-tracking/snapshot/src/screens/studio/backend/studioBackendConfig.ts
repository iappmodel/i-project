/**
 * Studio backend feature flags + env resolution (Stage 9).
 */

import {
  evaluateSupabaseEnvWarnings,
  getSupabaseMode,
  isStrictBackendEnv,
  isSupabaseConfigured,
  type StudioBackendModeEnv,
} from "../../../lib/supabase/supabaseConfig";
import type { BackendMode } from "./studioBackendMode";
import { resolveBackendMode } from "./studioBackendMode";

export type { BackendMode } from "./studioBackendMode";

export interface StudioBackendConfig {
  mode: StudioBackendModeEnv;
  supabaseConfigured: boolean;
  strictBackendMode: boolean;
  enablePersistence: boolean;
  enableRealtime: boolean;
  enableEdgeFunctions: boolean;
  enableServerValidation: boolean;
  enableServerLedger: boolean;
  enableServerVerification: boolean;
  envWarnings: ReturnType<typeof evaluateSupabaseEnvWarnings>;
}

function buildConfig(patch?: Partial<StudioBackendConfig>): StudioBackendConfig {
  const supabaseConfigured = isSupabaseConfigured();
  const mode = (patch?.mode ?? getSupabaseMode()) as StudioBackendModeEnv;
  const strictBackendMode = patch?.strictBackendMode ?? isStrictBackendEnv();
  const envWarnings = evaluateSupabaseEnvWarnings();
  const supaReady = mode === "supabase" && supabaseConfigured;
  return {
    mode,
    supabaseConfigured,
    strictBackendMode,
    enablePersistence: patch?.enablePersistence ?? supaReady,
    enableRealtime: patch?.enableRealtime ?? supaReady,
    enableEdgeFunctions: patch?.enableEdgeFunctions ?? supaReady,
    enableServerValidation: patch?.enableServerValidation ?? false,
    enableServerLedger: patch?.enableServerLedger ?? false,
    enableServerVerification: patch?.enableServerVerification ?? false,
    envWarnings,
  };
}

export function readStudioBackendConfigFromEnv(): StudioBackendConfig {
  return buildConfig();
}

export function mergeStudioBackendConfig(patch?: Partial<StudioBackendConfig>): StudioBackendConfig {
  return buildConfig(patch);
}

export function effectivePersistenceMode(config: StudioBackendConfig): BackendMode {
  return resolveBackendMode({
    mode: config.mode,
    supabaseConfigured: config.supabaseConfigured,
    enablePersistence: config.enablePersistence,
  });
}
