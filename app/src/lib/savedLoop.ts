const SAVED_ITEMS_KEY = 'loop2_saved_items_v1'

export interface SavedLoopItem {
  id: string
  title: string
  source: string
  savedAt: number
}

export function readSavedLoopItems(): SavedLoopItem[] {
  try {
    const raw = window.localStorage.getItem(SAVED_ITEMS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is SavedLoopItem =>
        typeof item?.id === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.source === 'string' &&
        typeof item?.savedAt === 'number',
    )
  } catch {
    return []
  }
}

export function saveLoopItem(item: SavedLoopItem): SavedLoopItem[] {
  const existing = readSavedLoopItems().filter((it) => it.id !== item.id)
  const next = [item, ...existing].slice(0, 20)
  window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(next))
  return next
}

export function removeLoopItem(id: string): SavedLoopItem[] {
  const next = readSavedLoopItems().filter((item) => item.id !== id)
  window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(next))
  return next
}
