/**
 * Resolved backend mode (mock vs Supabase client path).
 */

export type BackendMode = "mock" | "supabase";

/** Minimal input to avoid importing `studioBackendConfig` (cycle). */
export interface BackendModeInput {
  mode: "mock" | "supabase";
  supabaseConfigured: boolean;
  enablePersistence: boolean;
}

export function getActiveBackendMode(config: BackendModeInput): BackendMode {
  return resolveBackendMode(config);
}

export function shouldUseMockBackend(config: BackendModeInput): boolean {
  return resolveBackendMode(config) === "mock";
}

export function shouldUseSupabaseBackend(config: BackendModeInput): boolean {
  return resolveBackendMode(config) === "supabase";
}

/**
 * Supabase mode only when configured + enabled; otherwise mock (never throws).
 */
export function resolveBackendMode(config: BackendModeInput): BackendMode {
  if (config.mode !== "supabase") return "mock";
  if (!config.supabaseConfigured) return "mock";
  if (!config.enablePersistence) return "mock";
  return "supabase";
}
