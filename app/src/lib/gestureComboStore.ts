import type { ComboAction } from '../hooks/useGestureCombos'

export type ComboStepKind = 'gesture' | 'blink'

export type ComboStep = {
  kind: ComboStepKind
  value: string
}

export interface GestureComboRecord {
  id: string
  name: string
  steps: ComboStep[]
  action: ComboAction
  enabled: boolean
  createdAt: number
}

export const GESTURE_COMBOS_KEY = 'app_gesture_combos_v1'

export const DEFAULT_GESTURE_COMBOS: GestureComboRecord[] = [
  {
    id: 'combo-like-double-blink',
    name: 'Double blink → Like',
    steps: [{ kind: 'blink', value: '2' }],
    action: 'like',
    enabled: true,
    createdAt: 0,
  },
  {
    id: 'combo-promo-turn',
    name: 'Turn right → Promo',
    steps: [{ kind: 'gesture', value: 'faceTurnRight' }],
    action: 'promoFeed',
    enabled: true,
    createdAt: 0,
  },
  {
    id: 'combo-wallet-triple',
    name: 'Triple blink → Wallet',
    steps: [{ kind: 'blink', value: '3' }],
    action: 'openWallet',
    enabled: true,
    createdAt: 0,
  },
  {
    id: 'combo-save-wink',
    name: 'Left wink → Save',
    steps: [{ kind: 'gesture', value: 'leftWink' }],
    action: 'save',
    enabled: false,
    createdAt: 0,
  },
]

function newComboId(): string {
  return `combo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function describeComboStep(step: ComboStep): string {
  if (step.kind === 'blink') {
    const n = Number(step.value)
    if (n === 1) return 'single blink'
    if (n === 2) return 'double blink'
    if (n === 3) return 'triple blink'
    return `${step.value} blinks`
  }
  return step.value.replace(/([A-Z])/g, ' $1').trim()
}

export function describeComboSteps(steps: ComboStep[]): string {
  return steps.map(describeComboStep).join(' + ')
}

export function emitGestureCombosChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent('gestureCombosChanged'))
  } catch {
    // ignore
  }
}

export function loadGestureCombos(): GestureComboRecord[] {
  try {
    const raw = localStorage.getItem(GESTURE_COMBOS_KEY)
    if (!raw) return DEFAULT_GESTURE_COMBOS.map((c) => ({ ...c, createdAt: Date.now() }))
    const parsed = JSON.parse(raw) as GestureComboRecord[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_GESTURE_COMBOS.map((c) => ({ ...c, createdAt: Date.now() }))
    }
    return parsed
  } catch {
    return DEFAULT_GESTURE_COMBOS.map((c) => ({ ...c, createdAt: Date.now() }))
  }
}

export function saveGestureCombos(combos: GestureComboRecord[]): void {
  try {
    localStorage.setItem(GESTURE_COMBOS_KEY, JSON.stringify(combos))
    emitGestureCombosChanged()
  } catch {
    // ignore quota
  }
}

export function toggleGestureCombo(id: string, enabled: boolean): GestureComboRecord[] {
  const next = loadGestureCombos().map((c) => (c.id === id ? { ...c, enabled } : c))
  saveGestureCombos(next)
  return next
}

export function removeGestureCombo(id: string): GestureComboRecord[] {
  const next = loadGestureCombos().filter((c) => c.id !== id)
  saveGestureCombos(next.length > 0 ? next : DEFAULT_GESTURE_COMBOS.map((c) => ({ ...c, createdAt: Date.now() })))
  return loadGestureCombos()
}

export function addGestureComboPreset(preset: Omit<GestureComboRecord, 'id' | 'createdAt'>): GestureComboRecord[] {
  const record: GestureComboRecord = {
    ...preset,
    id: newComboId(),
    createdAt: Date.now(),
  }
  const next = [...loadGestureCombos(), record]
  saveGestureCombos(next)
  return next
}

export function resetGestureCombos(): GestureComboRecord[] {
  localStorage.removeItem(GESTURE_COMBOS_KEY)
  const fresh = DEFAULT_GESTURE_COMBOS.map((c) => ({ ...c, createdAt: Date.now() }))
  saveGestureCombos(fresh)
  return fresh
}

export function stepsMatch(a: ComboStep[], b: ComboStep[]): boolean {
  if (a.length !== b.length) return false
  return a.every((step, i) => step.kind === b[i]!.kind && step.value === b[i]!.value)
}
