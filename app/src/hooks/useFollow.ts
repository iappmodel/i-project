import { useCallback, useEffect, useState } from 'react'
import { isDemoFollowing, toggleDemoFollow } from '../lib/demoFollowStore'
import {
  checkFollowStatus,
  isValidFollowTarget,
  toggleFollow as toggleFollowService,
} from '../services/follow.service'
import { isSupabaseAuthEnabled } from '../lib/supabaseClient'
import { useSupabaseAuth } from '../state/useSupabaseAuth'

type UseFollowOptions = {
  creatorId: string | null
  onToggle?: (creatorId: string, isFollowing: boolean) => void
}

export function useFollow({ creatorId, onToggle }: UseFollowOptions) {
  const { user } = useSupabaseAuth()
  const live = isSupabaseAuthEnabled()
  const userId = user?.id ?? null
  const persistable = creatorId ? isValidFollowTarget(creatorId) : false

  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState(false)

  const refetch = useCallback(async () => {
    if (!creatorId) {
      setIsFollowing(false)
      return
    }
    if (!persistable) {
      setIsFollowing(isDemoFollowing(creatorId))
      return
    }
    if (!userId) {
      setIsFollowing(false)
      return
    }
    setLoading(true)
    try {
      const { isFollowing: status } = await checkFollowStatus(userId, creatorId)
      setIsFollowing(status)
    } finally {
      setLoading(false)
    }
  }, [creatorId, persistable, userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const toggleFollow = useCallback(async () => {
    if (!creatorId) return

    if (!persistable) {
      const next = toggleDemoFollow(creatorId)
      setIsFollowing(next)
      onToggle?.(creatorId, next)
      return
    }

    if (!userId) {
      onToggle?.(creatorId, false)
      return
    }
    if (creatorId === userId) return

    setToggling(true)
    const prev = isFollowing
    setIsFollowing(!prev)
    try {
      const result = await toggleFollowService(userId, creatorId, prev)
      if (!result.success) {
        setIsFollowing(prev)
        onToggle?.(creatorId, prev)
        return
      }
      const next = result.isFollowing ?? !prev
      setIsFollowing(next)
      onToggle?.(creatorId, next)
    } catch {
      setIsFollowing(prev)
      onToggle?.(creatorId, prev)
    } finally {
      setToggling(false)
    }
  }, [creatorId, isFollowing, onToggle, persistable, userId])

  return {
    isFollowing,
    loading,
    toggling,
    toggleFollow,
    canFollow: Boolean(creatorId),
    needsAuth: persistable && live && !userId,
    isDemo: !persistable,
    refetch,
  }
}
