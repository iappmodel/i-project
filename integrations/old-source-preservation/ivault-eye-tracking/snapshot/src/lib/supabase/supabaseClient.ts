/**
 * Supabase browser client (Stage 9). Returns null when not configured — never throws on import.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from "./supabaseConfig";

/** Untyped client until `supabase gen types` is wired; keeps Stage 9 compiling without perfect schema parity. */
let _cacheGeneration = 0;
let _client: SupabaseClient | null | undefined;

export function resetSupabaseClientCache(): void {
  _cacheGeneration += 1;
  _client = undefined;
}

export function getSupabaseClientCacheGeneration(): number {
  return _cacheGeneration;
}

/**
 * Singleton Supabase client for anon key usage. Null if URL/key missing.
 */
export function createSupabaseClient(): SupabaseClient | null {
  return getSupabaseClient();
}

export function getSupabaseClient(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  if (!isSupabaseConfigured()) {
    _client = null;
    return null;
  }
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    _client = null;
    return null;
  }
  try {
    _client = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch {
    _client = null;
  }
  return _client;
}
