import { DEFAULT_ELO_STACK, type EloPersonalityStack, type EloPresenceConfig, type PresenceRoomId } from './types'

const STORAGE_KEY = 'i-elo-presence-config-v1'

function cloneStack(stack: EloPersonalityStack): EloPersonalityStack {
  return JSON.parse(JSON.stringify(stack)) as EloPersonalityStack
}

export function defaultPresenceConfig(): EloPresenceConfig {
  return {
    activated: false,
    onboardingComplete: false,
    stack: cloneStack(DEFAULT_ELO_STACK),
    roomId: 'philosophy',
    panelOpen: false,
  }
}

export function loadPresenceConfig(): EloPresenceConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultPresenceConfig()
    const parsed = JSON.parse(raw) as Partial<EloPresenceConfig>
    const base = defaultPresenceConfig()
    return {
      ...base,
      ...parsed,
      stack: parsed.stack ? { ...base.stack, ...parsed.stack, layers: parsed.stack.layers ?? base.stack.layers } : base.stack,
    }
  } catch {
    return defaultPresenceConfig()
  }
}

export function savePresenceConfig(config: EloPresenceConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function updateStack(stack: EloPersonalityStack): EloPresenceConfig {
  const cfg = loadPresenceConfig()
  const next = { ...cfg, stack: cloneStack(stack), onboardingComplete: true }
  savePresenceConfig(next)
  return next
}

export function setRoom(roomId: PresenceRoomId): EloPresenceConfig {
  const cfg = loadPresenceConfig()
  const next = { ...cfg, roomId }
  savePresenceConfig(next)
  return next
}

export function setActivated(activated: boolean): EloPresenceConfig {
  const cfg = loadPresenceConfig()
  const next = { ...cfg, activated }
  savePresenceConfig(next)
  return next
}

export function setOnboardingComplete(complete: boolean): EloPresenceConfig {
  const cfg = loadPresenceConfig()
  const next = { ...cfg, onboardingComplete: complete }
  savePresenceConfig(next)
  return next
}

export function clearPresenceConfig(): void {
  localStorage.removeItem(STORAGE_KEY)
}
