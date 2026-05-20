import type { StudioBackendConfig } from "./studioBackendConfig";
import { shouldUseSupabaseBackend } from "./studioBackendMode";
import { createDefaultMockPersistenceAdapter } from "./studioMockPersistenceAdapter";
import type { StudioPersistenceAdapter } from "./studioPersistenceAdapter";
import { SupabaseStudioPersistenceAdapter } from "./supabaseStudioAdapter";

export function createStudioPersistenceAdapter(config: StudioBackendConfig): StudioPersistenceAdapter {
  if (config.mode === "supabase" && !shouldUseSupabaseBackend(config)) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[Studio] VITE_STUDIO_BACKEND_MODE=supabase but persistence is mock: check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY and enablePersistence."
      );
    }
  }
  if (shouldUseSupabaseBackend(config)) {
    return new SupabaseStudioPersistenceAdapter(config);
  }
  return createDefaultMockPersistenceAdapter();
}
