import type { EloMessage, EloPersonalityStack, PresenceRoom } from '../lib/elo/types'
import { getSupabaseClient } from '../lib/supabaseClient'

export interface FoundationReplyPayload {
  userText: string
  roomLabel: string
  relationshipMode: string
  primaryPreset?: string
  proofConnected: boolean
  recentMessages?: { role: 'user' | 'assistant'; content: string }[]
}

interface FoundationReplyResponse {
  success?: boolean
  useLocal?: boolean
  reply?: string
  source?: 'foundation' | 'doctrine'
  orbState?: string
  error?: string
}

export async function fetchFoundationReply(
  payload: FoundationReplyPayload,
): Promise<{ reply: string; source: 'foundation' | 'doctrine'; orbState?: string } | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.functions.invoke('elo-reply', { body: payload })
  if (error) return null

  const result = data as FoundationReplyResponse
  if (result.useLocal || !result.success || !result.reply) return null

  return {
    reply: result.reply,
    source: result.source ?? 'foundation',
    orbState: result.orbState,
  }
}

export function buildFoundationPayload(
  input: {
    userText: string
    stack: EloPersonalityStack
    room: PresenceRoom
    proofConnected: boolean
  },
  recentMessages: EloMessage[],
): FoundationReplyPayload {
  const primary = input.stack.layers.find((l) => l.role === 'primary')
  return {
    userText: input.userText,
    roomLabel: input.room.label,
    relationshipMode: input.stack.relationshipMode,
    primaryPreset: primary?.presetId,
    proofConnected: input.proofConnected,
    recentMessages: recentMessages.slice(-6).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
  }
}
