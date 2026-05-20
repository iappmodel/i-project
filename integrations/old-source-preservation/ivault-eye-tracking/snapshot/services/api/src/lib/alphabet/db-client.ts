import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../config/supabase";

/**
 * Service-role Supabase client for pipeline runtime and repositories only.
 */
export function createServiceDbClient(): SupabaseClient {
  return supabaseAdmin;
}
