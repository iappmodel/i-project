import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient, isSupabaseAuthEnabled } from '../lib/supabaseClient'

type Options = {
  contentId: string
  initialCount?: number
  enabled?: boolean
}

export function useContentLike({ contentId, initialCount = 0, enabled = true }: Options) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLikeCount(initialCount)
  }, [initialCount, contentId])

  useEffect(() => {
    if (!enabled || !isSupabaseAuthEnabled()) return
    const client = getSupabaseClient()
    if (!client) return

    let cancelled = false
    ;(async () => {
      const { data: { user } } = await client.auth.getUser()
      if (!user || cancelled) return

      const { data: rows } = await client
        .from('content_likes')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!cancelled) setLiked(Boolean(rows))
    })()

    return () => {
      cancelled = true
    }
  }, [contentId, enabled])

  const toggleLike = useCallback(async () => {
    const next = !liked
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))

    const client = getSupabaseClient()
    if (!enabled || !client || !isSupabaseAuthEnabled()) return

    setLoading(true)
    try {
      const { data: { user } } = await client.auth.getUser()
      if (!user) return

      if (next) {
        await client.from('content_likes').insert({ content_id: contentId, user_id: user.id })
      } else {
        await client
          .from('content_likes')
          .delete()
          .eq('content_id', contentId)
          .eq('user_id', user.id)
      }
    } catch {
      setLiked(!next)
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)))
    } finally {
      setLoading(false)
    }
  }, [contentId, enabled, liked])

  return { liked, likeCount, toggleLike, loading, setLikeCount }
}
