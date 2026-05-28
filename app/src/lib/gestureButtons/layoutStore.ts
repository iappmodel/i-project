import { DEFAULT_RAIL_BUTTON_IDS } from './presets'

const RAIL_ORDER_KEY = 'i-gesture-rail-order-v1'

export function loadRailOrder(): string[] {
  try {
    const raw = localStorage.getItem(RAIL_ORDER_KEY)
    if (!raw) return [...DEFAULT_RAIL_BUTTON_IDS]
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [...DEFAULT_RAIL_BUTTON_IDS]
    return parsed
  } catch {
    return [...DEFAULT_RAIL_BUTTON_IDS]
  }
}

export function saveRailOrder(ids: string[]): void {
  localStorage.setItem(RAIL_ORDER_KEY, JSON.stringify(ids))
}

export function addUserButtonId(): string {
  return `user-${Date.now()}`
}
