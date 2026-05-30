import { composeEloReply } from './eloReplyService'
import { applyDoctrineToReply, evaluateDoctrineInput } from './eloDoctrine'
import { applyPersonalization, buildPersonalizationHints } from './eloPersonalization'
import { getEloMemories } from './services/eloMemoryService'
import { buildFoundationPayload, fetchFoundationReply } from '../../services/eloReply'
import type { EloMessage, EloOrbState, EloPersonalityStack, PresenceRoom } from './types'

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
 * Rank 143 pipeline (Stage 1 — local mock foundation model):
 * Doctrine → Personalization → composeEloReply → Doctrine post-process
 */
export function resolveEloReplyLocal(input: EloRuntimeInput): EloRuntimeResult {
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

function orbStateFromText(input: EloRuntimeInput, hintsTone: string): EloOrbState {
  const lower = input.userText.toLowerCase()
  let orbState: EloOrbState = 'idle'
  if (lower.includes('trust') || lower.includes('wallet')) orbState = 'hasInsight'
  if (lower.includes('watch') || lower.includes('attention')) {
    orbState = input.proofConnected ? 'hasInsight' : 'thinking'
  }
  if (hintsTone === 'reflective') orbState = 'thinking'
  return orbState
}

/** Async pipeline — tries Supabase elo-reply edge function, falls back to local mock */
export async function resolveEloReplyAsync(
  input: EloRuntimeInput,
  recentMessages: EloMessage[] = [],
): Promise<EloRuntimeResult> {
  const block = evaluateDoctrineInput(input.userText)
  if (block) {
    return { reply: block.reply, orbState: 'blocked', doctrineApplied: true }
  }

  const foundation = await fetchFoundationReply(buildFoundationPayload(input, recentMessages))
  const hints = buildPersonalizationHints(input.stack, input.room, getEloMemories())

  if (foundation) {
    const reply = applyDoctrineToReply(applyPersonalization(foundation.reply, hints))
    const orbState = (foundation.orbState as EloOrbState | undefined) ?? orbStateFromText(input, hints.toneTag)
    return { reply, orbState, doctrineApplied: true }
  }

  return resolveEloReplyLocal(input)
}

/** @deprecated Use resolveEloReplyAsync — sync local-only path */
export function resolveEloReply(input: EloRuntimeInput): EloRuntimeResult {
  return resolveEloReplyLocal(input)
}
