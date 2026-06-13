import { useCallback, useEffect, useState } from 'react'
import {
  fetchSavedContent,
  isContentSaved,
  removeSavedContent,
  saveContent,
  type SavedContentItem,
  type SavedContentMetadata,
} from '../services/savedContent.service'
import { useSupabaseAuth } from '../state/useSupabaseAuth'

export function useSavedContent() {
  const { user } = useSupabaseAuth()
  const [items, setItems] = useState<SavedContentItem[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchSavedContent(user?.id ?? null)
      setItems(list)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (contentId: string, meta: SavedContentMetadata) => {
      const next = await saveContent(user?.id ?? null, contentId, meta)
      setItems(next)
      return next
    },
    [user?.id],
  )

  const remove = useCallback(
    async (contentId: string) => {
      const next = await removeSavedContent(user?.id ?? null, contentId)
      setItems(next)
      return next
    },
    [user?.id],
  )

  const isSaved = useCallback(
    (contentId: string) => isContentSaved(items, contentId),
    [items],
  )

  return { items, loading, reload, save, remove, isSaved, isDemo: !user?.id }
}
