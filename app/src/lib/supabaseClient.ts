import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseUrl(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL?.trim()
  return raw || null
}

export function getSupabaseAnonKey(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  return raw || null
}

export function isSupabaseAuthEnabled(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseAuthEnabled()) return null
  if (!client) {
    client = createClient(getSupabaseUrl()!, getSupabaseAnonKey()!)
  }
  return client
}

/** Seeded local demo credentials — see app/supabase/seed.sql */
export const DEMO_AUTH_EMAIL = 'demo-user-001@i.local'
export const DEMO_AUTH_PASSWORD = 'demo-local-password'
