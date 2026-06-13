import { getSupabaseClient } from '../lib/supabaseClient'
import {
  readSavedLoopItems,
  removeLoopItem,
  saveLoopItem,
  type SavedLoopItem,
} from '../lib/savedLoop'

export type SavedContentMetadata = {
  title: string
  source: string
  thumbnail?: string
  type?: 'promo' | 'video' | 'image'
}

export type SavedContentItem = SavedLoopItem & {
  thumbnail?: string
}

const toItem = (
  contentId: string,
  meta: SavedContentMetadata,
  savedAt: number,
): SavedContentItem => ({
  id: contentId,
  title: meta.title,
  source: meta.source,
  savedAt,
  thumbnail: meta.thumbnail,
})

export async function fetchSavedContent(userId: string | null): Promise<SavedContentItem[]> {
  const supabase = getSupabaseClient()
  if (!supabase || !userId) return readSavedLoopItems()

  const { data, error } = await supabase
    .from('saved_content')
    .select('content_id, created_at, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return readSavedLoopItems()

  return data.map((row) => {
    const meta = (row.metadata ?? {}) as SavedContentMetadata
    return toItem(row.content_id, {
      title: meta.title ?? 'Saved',
      source: meta.source ?? 'Feed',
      thumbnail: meta.thumbnail,
      type: meta.type,
    }, new Date(row.created_at).getTime())
  })
}

export async function saveContent(
  userId: string | null,
  contentId: string,
  meta: SavedContentMetadata,
): Promise<SavedContentItem[]> {
  const item = toItem(contentId, meta, Date.now())

  if (!userId) {
    return saveLoopItem(item)
  }

  const supabase = getSupabaseClient()
  if (!supabase) return saveLoopItem(item)

  const { error } = await supabase.from('saved_content').upsert(
    {
      user_id: userId,
      content_id: contentId,
      metadata: meta,
    },
    { onConflict: 'user_id,content_id' },
  )

  if (error) {
    return saveLoopItem(item)
  }

  return fetchSavedContent(userId)
}

export async function removeSavedContent(
  userId: string | null,
  contentId: string,
): Promise<SavedContentItem[]> {
  if (!userId) return removeLoopItem(contentId)

  const supabase = getSupabaseClient()
  if (!supabase) return removeLoopItem(contentId)

  await supabase.from('saved_content').delete().eq('user_id', userId).eq('content_id', contentId)
  return fetchSavedContent(userId)
}

export function isContentSaved(items: SavedContentItem[], contentId: string): boolean {
  return items.some((i) => i.id === contentId)
}
