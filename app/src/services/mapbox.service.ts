import { getSupabaseClient } from '../lib/supabaseClient'

export async function fetchMapboxToken(): Promise<string | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.functions.invoke('get-mapbox-token')
  if (error) return null
  const token = (data as { token?: string })?.token
  return token ?? null
}
