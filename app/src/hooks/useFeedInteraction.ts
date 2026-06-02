import { useCallback } from 'react'
import { trackFeedInteraction } from '../services/feed.service'
import { useContentLike } from './useContentLike'

type FeedContext = {
  contentId: string
  category?: string
  tags?: string[]
  initialLikeCount?: number
  trackEnabled?: boolean
}

export function useFeedInteraction({
  contentId,
  category,
  tags,
  initialLikeCount = 0,
  trackEnabled = true,
}: FeedContext) {
  const { liked, likeCount, toggleLike, loading } = useContentLike({
    contentId,
    initialCount: initialLikeCount,
    enabled: true,
  })

  const toggleLikeWithTrack = useCallback(async () => {
    const wasLiked = liked
    await toggleLike()
    if (!trackEnabled) return
    void trackFeedInteraction({
      contentId,
      action: wasLiked ? 'unlike' : 'like',
      category: category ?? null,
      tags: tags ?? [],
    })
  }, [category, contentId, liked, tags, toggleLike, trackEnabled])

  const trackShare = useCallback(async () => {
    if (!trackEnabled) return
    await trackFeedInteraction({
      contentId,
      action: 'share',
      category: category ?? null,
      tags: tags ?? [],
      idempotencyKey: crypto.randomUUID(),
    })
  }, [category, contentId, tags, trackEnabled])

  const trackViewStart = useCallback(async () => {
    if (!trackEnabled) return
    await trackFeedInteraction({
      contentId,
      action: 'view_start',
      category: category ?? null,
      tags: tags ?? [],
    })
  }, [category, contentId, tags, trackEnabled])

  const trackSkip = useCallback(async () => {
    if (!trackEnabled) return
    await trackFeedInteraction({
      contentId,
      action: 'skip',
      category: category ?? null,
      tags: tags ?? [],
    })
  }, [category, contentId, tags, trackEnabled])

  return {
    liked,
    likeCount,
    toggleLike: toggleLikeWithTrack,
    trackShare,
    trackViewStart,
    trackSkip,
    loading,
  }
}
