import type { EloPersonalityStack } from './types'
import { getPreset } from './presets'
import { getRelationshipMode } from './relationshipModes'

const VOICE_OUT_KEY = 'i-elo-voice-out-v1'

export function isSpeechOutSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function loadVoiceOutEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(VOICE_OUT_KEY) === '1'
}

export function saveVoiceOutEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VOICE_OUT_KEY, enabled ? '1' : '0')
}

export function voiceParamsFromStack(stack: EloPersonalityStack): { rate: number; pitch: number } {
  const primary = stack.layers.find((l) => l.role === 'primary')
  const preset = getPreset(primary?.presetId ?? 'calm_guide')
  const relationship = getRelationshipMode(stack.relationshipMode)
  let rate = 0.94
  if (relationship.speechCadence === 'slow') rate = 0.86
  if (relationship.speechCadence === 'fast') rate = 1.02
  if (preset?.toneHint === 'coach') rate = 1.0
  const pitch = stack.relationshipMode === 'mentor' ? 0.92 : 1.0
  return { rate, pitch }
}

export function speakEloText(
  text: string,
  opts?: { rate?: number; pitch?: number; onStart?: () => void; onEnd?: () => void; onPulse?: () => void },
): void {
  if (!isSpeechOutSupported()) return
  const trimmed = text.trim().slice(0, 480)
  if (!trimmed) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.lang = 'en-US'
  utterance.rate = opts?.rate ?? 0.94
  utterance.pitch = opts?.pitch ?? 1

  utterance.onstart = () => {
    opts?.onStart?.()
    opts?.onPulse?.()
  }
  utterance.onboundary = () => opts?.onPulse?.()
  utterance.onend = () => {
    opts?.onEnd?.()
    opts?.onPulse?.()
  }

  window.speechSynthesis.speak(utterance)
}

export function stopEloSpeech(): void {
  if (!isSpeechOutSupported()) return
  window.speechSynthesis.cancel()
}
