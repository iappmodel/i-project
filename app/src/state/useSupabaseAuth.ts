import { useCallback, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  DEMO_AUTH_EMAIL,
  DEMO_AUTH_PASSWORD,
  getSupabaseClient,
  isSupabaseAuthEnabled,
} from '../lib/supabaseClient'

export interface SupabaseAuthState {
  enabled: boolean
  loading: boolean
  user: User | null
  session: Session | null
  authError: string | null
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
}

export function useSupabaseAuth(): SupabaseAuthState {
  const enabled = isSupabaseAuthEnabled()
  const [loading, setLoading] = useState(enabled)
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthError(error.message)
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [enabled])

  const signInDemo = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) return
    setLoading(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_AUTH_EMAIL,
      password: DEMO_AUTH_PASSWORD,
    })
    if (error) setAuthError(error.message)
    setLoading(false)
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  // Auto sign-in demo user when Supabase auth is configured (local stack)
  useEffect(() => {
    if (!enabled || loading || user) return
    void signInDemo()
  }, [enabled, loading, user, signInDemo])

  return {
    enabled,
    loading,
    user,
    session,
    authError,
    signInDemo,
    signOut,
  }
}
