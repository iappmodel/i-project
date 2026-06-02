import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ImmersiveFeedItem } from '../data/immersiveFeedContext'
import { DEMO_FEED_ITEMS, fetchPersonalizedFeed } from '../services/feed.service'

export function useImmersiveFeed(enabled = true) {
  const [items, setItems] = useState<ImmersiveFeedItem[]>(DEMO_FEED_ITEMS)
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [excludeIds, setExcludeIds] = useState<string[]>([])

  const load = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const result = await fetchPersonalizedFeed({ excludeIds, limit: 12 })
      if (result.items.length > 0) {
        setItems(result.items)
        setIndex(0)
        if (result.meta.nextCursor) {
          setExcludeIds(result.meta.nextCursor)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [enabled, excludeIds])

  useEffect(() => {
    void load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  const current = useMemo(
    () => items[Math.min(index, Math.max(0, items.length - 1))] ?? DEMO_FEED_ITEMS[0],
    [items, index],
  )

  const next = useCallback(() => {
    setIndex((i) => {
      const nextIdx = i + 1
      if (nextIdx >= items.length && items.length > 0) return 0
      return nextIdx % items.length
    })
  }, [items.length])

  const prev = useCallback(() => {
    setIndex((i) => {
      const prevIdx = i - 1
      if (prevIdx < 0) return items.length - 1
      return prevIdx
    })
  }, [items.length])

  const appendMore = useCallback(async () => {
    const result = await fetchPersonalizedFeed({ excludeIds, limit: 8 })
    if (result.items.length === 0) return
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id))
      const fresh = result.items.filter((x) => !seen.has(x.id))
      return fresh.length ? [...prev, ...fresh] : prev
    })
    if (result.meta.nextCursor) setExcludeIds(result.meta.nextCursor)
  }, [excludeIds])

  return {
    items,
    index,
    current,
    loading,
    next,
    prev,
    reload: load,
    appendMore,
    setIndex,
  }
}
