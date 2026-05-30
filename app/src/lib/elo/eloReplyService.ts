import { mockEarningHistory, mockTrustState, mockWalletState } from './mockData'
import { getPreset } from './presets'
import { getRelationshipMode } from './relationshipModes'
import type { EloPersonalityStack, PresenceRoom } from './types'

export interface EloReplyInput {
  userText: string
  stack: EloPersonalityStack
  room: PresenceRoom
  proofConnected: boolean
}

/** Stage 1 companion replies — personality + platform context, no LLM yet */
export function composeEloReply(input: EloReplyInput): string {
  const text = input.userText.trim()
  const lower = text.toLowerCase()
  const primary = input.stack.layers.find((l) => l.role === 'primary')
  const preset = getPreset(primary?.presetId ?? 'calm_guide')
  const relationship = getRelationshipMode(input.stack.relationshipMode)
  const voice = preset?.toneHint === 'coach' ? 'direct' : 'warm'

  if (!text) {
    return `I'm listening — ${relationship.label} mode, ${input.room.label} room.`
  }

  if (lower.includes('wallet') || lower.includes('coin') || lower.includes('earn')) {
    return voice === 'direct'
      ? `Spendable ${mockWalletState.spendable}. Pending ${mockWalletState.pending}. Pick one verified watch and finish it — that's the move.`
      : `Your wallet is breathing — ${mockWalletState.spendable} ready, ${mockWalletState.pending} still settling. I can guide you to a verified offer when you want.`
  }

  if (lower.includes('trust') || lower.includes('tier')) {
    return `Trust tier ${mockTrustState.tier} — ${Math.round(mockTrustState.progressToNextTier * 100)}% toward tier ${mockTrustState.nextTier}. ${mockTrustState.unlockHint}`
  }

  if (lower.includes('watch') || lower.includes('video') || lower.includes('attention')) {
    return input.proofConnected
      ? `Stay with this watch. Proof is live — I'll read your attention band and keep you aligned with the reward path.`
      : `Hold the frame. Proof is quiet right now, but I'm still here beside what you're watching.`
  }

  if (lower.includes('who') && lower.includes('you')) {
    return `I'm ELO — ${preset?.label ?? 'your companion'} in ${input.room.label}. ${preset?.tagline ?? 'Present with you.'}`
  }

  if (lower.includes('hello') || lower.includes('hi') || lower === 'elo') {
    return `${preset?.tagline ?? 'Present with you.'} What do you want to explore in this ${input.room.label.toLowerCase()} room?`
  }

  return voice === 'direct'
    ? `Noted. Strongest pattern today: ${mockEarningHistory.bestCategory}. Say wallet, watch, or trust if you want a concrete next step.`
    : `I hear you. Your recent rhythm favors ${mockEarningHistory.bestCategory} — tell me if you want wallet, trust, or what you're watching.`
}
