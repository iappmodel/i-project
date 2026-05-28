import { BUTTON_PRESETS, LIKE_LOVE_PRESET } from './presets'
import type { ButtonInstanceConfig, GestureBinding, GestureTrigger } from './types'

const STORAGE_KEY = 'i-gesture-button-configs-v1'

function cloneConfig(config: ButtonInstanceConfig): ButtonInstanceConfig {
  return JSON.parse(JSON.stringify(config)) as ButtonInstanceConfig
}

function normalizeConfig(
  raw: Partial<ButtonInstanceConfig> & Pick<ButtonInstanceConfig, 'id'>,
): ButtonInstanceConfig {
  const preset = BUTTON_PRESETS.find((p) => p.id === raw.id)
  const base = preset ? cloneConfig(preset) : cloneConfig(LIKE_LOVE_PRESET)
  return {
    ...base,
    ...raw,
    enabled: raw.enabled ?? base.enabled ?? true,
    thresholds: { ...base.thresholds, ...raw.thresholds },
    bindings: raw.bindings?.length ? raw.bindings : base.bindings,
  }
}

export function defaultConfigs(): Record<string, ButtonInstanceConfig> {
  const map: Record<string, ButtonInstanceConfig> = {}
  for (const preset of BUTTON_PRESETS) {
    map[preset.id] = cloneConfig(preset)
  }
  return map
}

export function loadButtonConfigs(): Record<string, ButtonInstanceConfig> {
  const base = defaultConfigs()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Record<string, Partial<ButtonInstanceConfig> & { id: string }>
    const merged = { ...base }
    for (const [id, cfg] of Object.entries(parsed)) {
      merged[id] = normalizeConfig({ ...cfg, id })
    }
    return merged
  } catch {
    return base
  }
}

export function saveButtonConfig(config: ButtonInstanceConfig): void {
  const all = loadButtonConfigs()
  all[config.id] = config
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function getButtonConfig(id: string): ButtonInstanceConfig {
  const cfg = loadButtonConfigs()[id]
  return cfg ? normalizeConfig(cfg) : cloneConfig(LIKE_LOVE_PRESET)
}

export function upsertButtonConfig(config: ButtonInstanceConfig): ButtonInstanceConfig {
  const next = normalizeConfig(config)
  saveButtonConfig(next)
  return next
}

export function updateBinding(
  configId: string,
  trigger: GestureTrigger,
  binding: GestureBinding,
): ButtonInstanceConfig {
  const config = getButtonConfig(configId)
  const nextBindings = config.bindings.filter((b) => b.trigger !== trigger)
  nextBindings.push(binding)
  const updated = { ...config, bindings: nextBindings }
  saveButtonConfig(updated)
  return updated
}

export function resetButtonConfig(configId: string): ButtonInstanceConfig {
  const preset = BUTTON_PRESETS.find((p) => p.id === configId)
  const fresh = preset ? cloneConfig(preset) : cloneConfig(LIKE_LOVE_PRESET)
  saveButtonConfig(fresh)
  return fresh
}
