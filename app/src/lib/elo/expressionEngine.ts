import type {
  EloExpressionState,
  EloOrbState,
  EloPersonalityStack,
  OperatingMode,
  PresenceRoom,
  RelationshipMode,
} from './types'
import { getOperatingMode } from './operatingModes'
import { getRelationshipMode } from './relationshipModes'

export interface ExpressionInput {
  hasFace: boolean
  headYaw: number
  headPitch: number
  eyeOpenness: number
  orbState: EloOrbState
  room: PresenceRoom
  stack: EloPersonalityStack
  activated: boolean
  evoked: boolean
  emergence: number
  attentionScore?: number
  idlePhase: number
  speechEnergy?: number
}

const BASE_OPACITY = 0.22
const BASE_LINE = 'rgba(220, 235, 255, 0.5)'

function orbGlow(state: EloOrbState): { color: string; boost: number } {
  switch (state) {
    case 'hasInsight':
      return { color: 'rgba(100, 200, 255, 0.65)', boost: 0.08 }
    case 'celebrating':
      return { color: 'rgba(80, 220, 160, 0.6)', boost: 0.1 }
    case 'warning':
      return { color: 'rgba(230, 180, 80, 0.55)', boost: 0.06 }
    case 'blocked':
      return { color: 'rgba(255, 100, 110, 0.5)', boost: 0.04 }
    case 'thinking':
      return { color: 'rgba(180, 140, 255, 0.55)', boost: 0.05 }
    case 'muted':
      return { color: 'rgba(160, 170, 190, 0.35)', boost: -0.06 }
    default:
      return { color: BASE_LINE, boost: 0 }
  }
}

function operatingModifiers(mode: OperatingMode | null): { opacity: number; intensity: number } {
  const cfg = getOperatingMode(mode)
  if (!cfg) return { opacity: 1, intensity: 1 }
  return { opacity: cfg.opacityScale, intensity: cfg.intensityScale }
}

function relationshipNod(relationship: RelationshipMode, phase: number): number {
  const cfg = getRelationshipMode(relationship)
  return Math.sin(phase * cfg.nodFrequency) * 0.04 * cfg.nodFrequency
}

export function computeExpression(input: ExpressionInput): EloExpressionState {
  const op = operatingModifiers(input.stack.operatingMode)
  const glow = orbGlow(input.orbState)
  const roomScale = input.room.opacityScale * op.opacity
  const micro = input.room.microExpressionScale * op.intensity

  const faceBoost = input.hasFace ? 0.06 : -0.04
  const blinkScale = Math.max(0.15, Math.min(1, input.eyeOpenness))
  const tiltY = input.hasFace ? input.headYaw * 0.35 : Math.sin(input.idlePhase * 0.5) * 3
  const tiltX = input.hasFace ? input.headPitch * 0.25 : Math.cos(input.idlePhase * 0.4) * 2

  let nodPhase = relationshipNod(input.stack.relationshipMode, input.idlePhase)
  if (input.attentionScore !== undefined) {
    if (input.attentionScore > 0.75) nodPhase += 0.02
    if (input.attentionScore < 0.4) nodPhase -= 0.01
  }

  const speechBoost = (input.speechEnergy ?? 0) * 0.03 * micro
  const isPresent = input.activated || input.evoked
  const emergenceProgress = isPresent ? Math.max(input.emergence, input.evoked ? 0.15 : 0) : 0
  const baseOpacity = BASE_OPACITY * roomScale + glow.boost + faceBoost + speechBoost

  return {
    opacity: isPresent
      ? Math.max(0.14, Math.min(0.42, baseOpacity * Math.max(emergenceProgress, 0.35)))
      : 0,
    tiltY: tiltY + nodPhase * 20,
    tiltX: tiltX + nodPhase * 10,
    blinkScale,
    pulseSpeed: input.room.pulseSpeed,
    lineColor: input.orbState === 'idle' ? input.room.lineColor : glow.color,
    nodPhase,
    emergence: emergenceProgress,
    microExpressionScale: micro,
  }
}

export function deriveOrbState(input: {
  proofConnected: boolean
  eloStatusLine: string
  hasFace: boolean
  verificationWatching: boolean
  attentionScore?: number
}): EloOrbState {
  const line = input.eloStatusLine.toLowerCase()
  if (input.proofConnected) {
    if (line.includes('sealed') || line.includes('complete')) return 'celebrating'
    if (line.includes('warn') || line.includes('fail')) return 'warning'
    if (line.includes('block')) return 'blocked'
  }
  if (input.verificationWatching) {
    if (input.attentionScore !== undefined && input.attentionScore > 0.7) return 'hasInsight'
    return 'thinking'
  }
  if (input.hasFace) return 'idle'
  return 'idle'
}
