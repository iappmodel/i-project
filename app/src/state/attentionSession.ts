/** Demo attention session — mirrors production `attention_sessions` invariant (CR-01). */

export type AttentionSessionStatus = 'active' | 'validated' | 'redeemed' | 'failed'

export interface AttentionSession {
  id: string
  offerId: string
  status: AttentionSessionStatus
  createdAt: number
  validatedAt?: number
  redeemedAt?: number
  acsScore?: number
}

export function createAttentionSession(offerId: string): AttentionSession {
  const id =
    globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
  return {
    id,
    offerId,
    status: 'active',
    createdAt: Date.now(),
  }
}

export function canValidateSession(
  session: AttentionSession | null,
): session is AttentionSession {
  return session?.status === 'active'
}

/** No validated session → no reward (non-negotiable). */
export function canIssueAttentionReward(
  session: AttentionSession | null,
): session is AttentionSession {
  return session?.status === 'validated'
}
