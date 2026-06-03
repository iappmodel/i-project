import { getSupabaseClient } from '../lib/supabaseClient'
import type { ImmersiveFeedItem } from '../data/immersiveFeedContext'

export type FeedInteractionAction =
  | 'view_start'
  | 'view_progress'
  | 'view_complete'
  | 'like'
  | 'unlike'
  | 'share'
  | 'save'
  | 'unsave'
  | 'skip'

export interface PersonalizedFeedMeta {
  personalized: boolean
  coldStart: boolean
  hasMore: boolean
  nextCursor: string[] | null
}

export interface PersonalizedFeedResult {
  items: ImmersiveFeedItem[]
  meta: PersonalizedFeedMeta
}

/** Cold-start items when edge/DB unavailable (matches archive sample shape) */
export const DEMO_FEED_ITEMS: ImmersiveFeedItem[] = [
  {
    id: 'nike-pegasus-41',
    contentId: 'nike-pegasus-41',
    creatorId: 'nike',
    creatorName: 'Nike Running',
    creatorLocation: 'Global',
    creatorAvatarInitials: 'NK',
    initialLikeCount: 8420,
    title: 'Pegasus 41 · Watch & earn',
    category: 'sponsored',
    tags: ['running', 'sponsored'],
    thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    videoSrc: null,
    reward: 2,
    coinType: 'icoin',
    duration: 45,
  },
  {
    id: 'demo-2',
    contentId: 'demo-2',
    creatorId: 'c2',
    creatorName: 'NOVA',
    creatorLocation: 'Lisbon',
    creatorAvatarInitials: 'NO',
    initialLikeCount: 1920,
    title: 'Morning Workout',
    category: 'fitness',
    tags: ['fitness', 'health'],
    thumbnail: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80',
    videoSrc: null,
    reward: 5,
    coinType: 'icoin',
    duration: 120,
  },
  {
    id: 'demo-3',
    contentId: 'demo-3',
    creatorId: 'c3',
    creatorName: 'KAI',
    creatorLocation: 'Bali',
    creatorAvatarInitials: 'KA',
    initialLikeCount: 3104,
    title: 'Cooking Masterclass',
    category: 'food',
    tags: ['food', 'cooking'],
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1200&q=80',
    videoSrc: null,
    reward: 4,
    coinType: 'icoin',
    duration: 180,
  },
  {
    id: 'demo-4',
    contentId: 'demo-4',
    creatorId: 'c4',
    creatorName: 'MIRA',
    creatorLocation: 'Reykjavik',
    creatorAvatarInitials: 'MI',
    initialLikeCount: 987,
    title: 'Tech News Update',
    category: 'tech',
    tags: ['tech', 'news'],
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    videoSrc: null,
    reward: 3,
    coinType: 'icoin',
    duration: 90,
  },
]

function mapEdgeItem(raw: Record<string, unknown>): ImmersiveFeedItem {
  const creator = (raw.creator as Record<string, unknown>) ?? {}
  const displayName = String(creator.displayName ?? creator.username ?? 'Creator')
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return {
    id: String(raw.id),
    contentId: String(raw.id),
    creatorId: String(creator.id ?? 'creator-unknown'),
    creatorName: displayName.toUpperCase(),
    creatorLocation: String(raw.category ?? 'Feed'),
    creatorAvatarInitials: initials || 'CR',
    initialLikeCount: Number(raw.likes_count ?? 0) || Math.floor(400 + Math.random() * 2000),
    title: String(raw.title ?? 'Untitled'),
    category: String(raw.category ?? ''),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
    thumbnail: String(raw.thumbnail ?? ''),
    videoSrc: raw.videoSrc ? String(raw.videoSrc) : null,
    reward: Number(raw.reward ?? 0),
    coinType: (raw.coinType as 'icoin' | 'vicoin') ?? 'icoin',
    duration: Number(raw.duration ?? 60),
  }
}

export async function fetchPersonalizedFeed(options?: {
  excludeIds?: string[]
  limit?: number
}): Promise<PersonalizedFeedResult> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      items: DEMO_FEED_ITEMS,
      meta: { personalized: false, coldStart: true, hasMore: false, nextCursor: null },
    }
  }

  const { data, error } = await supabase.functions.invoke('get-personalized-feed', {
    body: {
      limit: options?.limit ?? 12,
      excludeIds: options?.excludeIds ?? [],
    },
  })

  if (error || !data?.success || !Array.isArray(data.feed)) {
    return {
      items: DEMO_FEED_ITEMS,
      meta: { personalized: false, coldStart: true, hasMore: false, nextCursor: null },
    }
  }

  const meta = data.meta ?? {}
  return {
    items: (data.feed as Record<string, unknown>[]).map(mapEdgeItem),
    meta: {
      personalized: Boolean(meta.personalized),
      coldStart: Boolean(meta.coldStart),
      hasMore: Boolean(meta.hasMore),
      nextCursor: Array.isArray(meta.nextCursor) ? meta.nextCursor : null,
    },
  }
}

export async function trackFeedInteraction(payload: {
  contentId: string
  action: FeedInteractionAction
  category?: string | null
  tags?: string[]
  watchDuration?: number
  totalDuration?: number
  attentionScore?: number
  idempotencyKey?: string
}): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) return false

  const headers: Record<string, string> = {}
  if (payload.idempotencyKey) {
    headers['Idempotency-Key'] = payload.idempotencyKey
  }

  const { data, error } = await supabase.functions.invoke('track-interaction', {
    headers,
    body: {
      contentId: payload.contentId,
      action: payload.action,
      category: payload.category ?? null,
      tags: payload.tags ?? [],
      watchDuration: payload.watchDuration ?? 0,
      totalDuration: payload.totalDuration ?? 0,
      attentionScore: payload.attentionScore ?? 0,
      contentType: 'video',
      eventNonce: payload.idempotencyKey,
    },
  })

  return !error && data?.success !== false
}
