import { DEMO_LOCAL_USER_REF, getPopValidatorBaseUrl } from './settlementConfig'
import type { ProofPacketV0Json } from './demoProofPacket'

export interface PopPendingHold {
  sessionId: string
  localUserRef: string
  offerId: string
  contentId: string
  reviewStatus: string
  amount: number
  currency: 'icoin' | 'vicoin'
  holdStatus: 'pending' | 'settled' | 'cancelled'
  releaseStatus: string
  createdAt: string
  settledAt: string | null
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

export async function checkValidatorHealth(): Promise<boolean> {
  const url = getPopValidatorBaseUrl()
  if (!url) return false
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/health`)
    return res.ok
  } catch {
    return false
  }
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
