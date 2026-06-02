import { DEMO_LOCAL_USER_REF, getPopValidatorBaseUrl, resolveDemoUserId } from './settlementConfig'
import type { ProofPacketV0Json } from './demoProofPacket'

export interface PopPendingHold {
  sessionId: string
  localUserRef: string
  offerId: string
  contentId: string
  reviewStatus: string
  amount: number
  currency: 'icoin' | 'vicoin'
  holdStatus: 'pending' | 'appeal_pending' | 'settled' | 'cancelled'
  releaseStatus: string
  releaseEligibleAt: string | null
  appealExpiresAt: string | null
  reverifyUsed: boolean
  trustTierAtHold: string | null
  createdAt: string
  settledAt: string | null
}

export interface ValidatorHealth {
  ok: boolean
  settlement: 'supabase' | 'local-json'
  supabaseEnabled: boolean
}

export interface SettleHoldResponse {
  sessionId: string
  source: 'supabase' | 'local'
  settlement: Record<string, unknown>
}

export interface ValidateProofResponse {
  mode: string
  sessionId: string
  reviewStatus?: string
  hold?: {
    amount: number
    currency: string
    status: string
    releaseStatus: string
  } | null
  supabase?: { enabled: boolean; outcome?: string; error?: string }
}

function baseUrl(): string {
  const url = getPopValidatorBaseUrl()
  if (!url) throw new Error('VITE_POP_VALIDATOR_URL is not configured')
  return url.replace(/\/$/, '')
}

function mapHold(row: Record<string, unknown>): PopPendingHold {
  return {
    sessionId: String(row.session_id),
    localUserRef: String(row.local_user_ref),
    offerId: String(row.offer_id),
    contentId: String(row.content_id),
    reviewStatus: String(row.review_status),
    amount: Number(row.amount),
    currency: row.currency === 'vicoin' ? 'vicoin' : 'icoin',
    holdStatus: (row.hold_status as PopPendingHold['holdStatus']) ?? 'pending',
    releaseStatus: String(row.release_status),
    releaseEligibleAt: row.release_eligible_at
      ? String(row.release_eligible_at)
      : null,
    appealExpiresAt: row.appeal_expires_at ? String(row.appeal_expires_at) : null,
    reverifyUsed: row.reverify_used === true,
    trustTierAtHold: row.trust_tier_at_hold ? String(row.trust_tier_at_hold) : null,
    createdAt: String(row.created_at),
    settledAt: row.settled_at ? String(row.settled_at) : null,
  }
}

export async function submitProofPacket(
  packet: ProofPacketV0Json,
  artifactId?: string,
): Promise<ValidateProofResponse> {
  const res = await fetch(`${baseUrl()}/v1/proof-packets/validate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packet, mode: 'pending', artifactId }),
  })
  const body = (await res.json()) as ValidateProofResponse & { error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? `validate failed (${res.status})`)
  }
  return body
}

export async function fetchPendingHolds(
  localUserRef: string = DEMO_LOCAL_USER_REF,
): Promise<PopPendingHold[]> {
  const params = new URLSearchParams({ localUserRef })
  const res = await fetch(`${baseUrl()}/v1/pending-holds?${params}`)
  const body = (await res.json()) as { holds?: Record<string, unknown>[]; error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? `list holds failed (${res.status})`)
  }
  return (body.holds ?? []).map(mapHold)
}

export async function fetchValidatorHealth(): Promise<ValidatorHealth | null> {
  const url = getPopValidatorBaseUrl()
  if (!url) return null
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/health`)
    if (!res.ok) return null
    const body = (await res.json()) as {
      ok?: boolean
      settlement?: string
      supabase?: { enabled?: boolean }
    }
    const settlement =
      body.settlement === 'supabase' || body.supabase?.enabled ? 'supabase' : 'local-json'
    return {
      ok: Boolean(body.ok),
      settlement,
      supabaseEnabled: Boolean(body.supabase?.enabled),
    }
  } catch {
    return null
  }
}

export async function settlePendingHold(
  sessionId: string,
  authUserId?: string | null,
): Promise<SettleHoldResponse> {
  const health = await fetchValidatorHealth()
  const useSupabase = health?.supabaseEnabled === true

  if (useSupabase) {
    const res = await fetch(`${baseUrl()}/v1/pending-holds/${encodeURIComponent(sessionId)}/settle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: resolveDemoUserId(authUserId) }),
    })
    const body = (await res.json()) as SettleHoldResponse & { error?: string }
    if (!res.ok) {
      throw new Error(body.error ?? `settle failed (${res.status})`)
    }
    return body
  }

  const res = await fetch(
    `${baseUrl()}/v1/pending-holds/${encodeURIComponent(sessionId)}/settle-demo`,
    { method: 'POST' },
  )
  const body = (await res.json()) as SettleHoldResponse & { error?: string }
  if (!res.ok) {
    throw new Error(body.error ?? `settle-demo failed (${res.status})`)
  }
  return body
}

export async function checkValidatorHealth(): Promise<boolean> {
  const health = await fetchValidatorHealth()
  return health?.ok === true
}

export function holdToTransaction(hold: PopPendingHold): {
  id: string
  source: string
  timeLabel: string
  amountDisplay: string
  kind: 'positive' | 'pending'
} {
  const coin = hold.currency === 'vicoin' ? 'v' : 'i'
  const settled = hold.holdStatus === 'settled'
  return {
    id: `pop-${hold.sessionId}`,
    source: hold.offerId.replace(/-watch$/, '').replace(/-/g, ' '),
    timeLabel: settled ? 'Settled' : 'Validating…',
    amountDisplay: settled
      ? `+${hold.amount} ${coin}`
      : `+${hold.amount} ${coin} pending`,
    kind: settled ? 'positive' : 'pending',
  }
}
