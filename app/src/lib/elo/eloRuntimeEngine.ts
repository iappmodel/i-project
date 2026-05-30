import { composeEloReply } from './eloReplyService'
import { applyDoctrineToReply, evaluateDoctrineInput } from './eloDoctrine'
import { applyPersonalization, buildPersonalizationHints } from './eloPersonalization'
import { getEloMemories } from './services/eloMemoryService'
import type { EloOrbState, EloPersonalityStack, PresenceRoom } from './types'

export interface EloRuntimeInput {
  userText: string
  stack: EloPersonalityStack
  room: PresenceRoom
  proofConnected: boolean
}

export interface EloRuntimeResult {
  reply: string
  orbState: EloOrbState
  doctrineApplied: boolean
}

/**
 * Rank 143 pipeline (Stage 1 — mock foundation model):
 * Doctrine → Personalization → composeEloReply → Doctrine post-process
 */
export function resolveEloReply(input: EloRuntimeInput): EloRuntimeResult {
  const block = evaluateDoctrineInput(input.userText)
  if (block) {
    return {
      reply: block.reply,
      orbState: 'blocked',
      doctrineApplied: true,
    }
  }

  const base = composeEloReply({
    userText: input.userText,
    stack: input.stack,
    room: input.room,
    proofConnected: input.proofConnected,
  })

  const hints = buildPersonalizationHints(input.stack, input.room, getEloMemories())
  const personalized = applyPersonalization(base, hints)
  const reply = applyDoctrineToReply(personalized)

  const lower = input.userText.toLowerCase()
  let orbState: EloOrbState = 'idle'
  if (lower.includes('trust') || lower.includes('wallet')) orbState = 'hasInsight'
  if (lower.includes('watch') || lower.includes('attention')) orbState = input.proofConnected ? 'hasInsight' : 'thinking'
  if (hints.toneTag === 'reflective') orbState = 'thinking'

  return { reply, orbState, doctrineApplied: true }
}
