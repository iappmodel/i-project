import { getSupabaseClient } from '@/lib/supabaseClient'

export const supabase = {
  from(table: string) {
    const client = getSupabaseClient()
    if (!client) {
      throw new Error(`Supabase is not configured (table: ${table})`)
    }
    return client.from(table)
  },
}
