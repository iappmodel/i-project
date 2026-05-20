/**
 * Supabase / Studio backend env (Stage 9). Safe at import time — no throws.
 * Vite: `import.meta.env.VITE_*`. Node/tests: `process.env` when defined.
 */

export type StudioBackendModeEnv = "mock" | "supabase";

function readRawEnv(name: string): string | undefined {
  try {
    const im = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
    const v = im.env?.[name];
    if (v != null && String(v).length > 0) return String(v);
  } catch {
    /* non-Vite */
  }
  try {
    if (typeof process !== "undefined" && process.env) {
      const p = process.env[name];
      if (p != null && p.length > 0) return p;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function getSupabaseUrl(): string | undefined {
  return readRawEnv("VITE_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string | undefined {
  return readRawEnv("VITE_SUPABASE_ANON_KEY");
}

export function isSupabaseConfigured(): boolean {
  const u = getSupabaseUrl()?.trim();
  const k = getSupabaseAnonKey()?.trim();
  return Boolean(u && k);
}

/** Raw env value before resolution / fallback. */
export function getSupabaseMode(): StudioBackendModeEnv {
  const raw = (readRawEnv("VITE_STUDIO_BACKEND_MODE") ?? "mock").toLowerCase().trim();
  if (raw === "supabase") return "supabase";
  return "mock";
}

export function isStrictBackendEnv(): boolean {
  const v = (readRawEnv("VITE_STUDIO_STRICT_BACKEND") ?? "").toLowerCase().trim();
  return v === "1" || v === "true" || v === "yes";
}

export type SupabaseConfigWarning = {
  code: "SUPABASE_MODE_WITHOUT_CREDENTIALS" | "STRICT_MODE_MISSING_CREDENTIALS";
  message: string;
};

/**
 * If mode is `supabase` but URL/anon missing: non-strict → warn + treat as disconnected;
 * strict → warn (caller should not use mock without explicit decision).
 */
export function evaluateSupabaseEnvWarnings(): SupabaseConfigWarning[] {
  const mode = getSupabaseMode();
  const ok = isSupabaseConfigured();
  const strict = isStrictBackendEnv();
  const out: SupabaseConfigWarning[] = [];
  if (mode === "supabase" && !ok) {
    out.push({
      code: "SUPABASE_MODE_WITHOUT_CREDENTIALS",
      message:
        "VITE_STUDIO_BACKEND_MODE=supabase but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. Persistence falls back to mock unless strict backend is enforced elsewhere.",
    });
  }
  if (strict && !ok) {
    out.push({
      code: "STRICT_MODE_MISSING_CREDENTIALS",
      message: "VITE_STUDIO_STRICT_BACKEND is set but Supabase credentials are missing. Fix env before enabling strict production paths.",
    });
  }
  return out;
}
