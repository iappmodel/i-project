const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function isWebVisionEnabled(): boolean {
  const raw = import.meta.env.VITE_VISION_ENGINE
  if (typeof raw !== 'string') return false
  return TRUE_VALUES.has(raw.trim().toLowerCase())
}
