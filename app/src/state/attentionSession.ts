/** Demo attention session — mirrors production `attention_sessions` invariant (CR-01). */

export type AttentionSessionStatus = 'active' | 'validated' | 'redeemed' | 'failed'

export interface AttentionEvidenceSample {
  t: number
  score: number
}

export interface AttentionSession {
  id: string
  offerId: string
  status: AttentionSessionStatus
  createdAt: number
  validatedAt?: number
  redeemedAt?: number
  acsScore?: number
  /** Rolling watch attention samples (derived scores only). */
  attentionSamples?: AttentionEvidenceSample[]
  peakAttentionScore?: number
  watchDurationMs?: number
}

export function createAttentionSession(offerId: string): AttentionSession {
  const id =
    globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`
  return {
    id,
    offerId,
    status: 'active',
    createdAt: Date.now(),
    attentionSamples: [],
    peakAttentionScore: 0,
  }
}

export function recordAttentionSample(
  session: AttentionSession,
  score: number,
  now = Date.now(),
): AttentionSession {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const samples = [...(session.attentionSamples ?? []), { t: now, score: clamped }]
  const peak = Math.max(session.peakAttentionScore ?? 0, clamped)
  return {
    ...session,
    attentionSamples: samples.slice(-120),
    peakAttentionScore: peak,
    watchDurationMs: now - session.createdAt,
  }
}

/** Qualification score for verification gate — requires minimum sample count. */
export function computeSessionAttentionScore(session: AttentionSession): number {
  const samples = session.attentionSamples ?? []
  if (samples.length === 0) {
    return session.acsScore ?? 0
  }
  const sum = samples.reduce((acc, s) => acc + s.score, 0)
  return Math.round(sum / samples.length)
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
