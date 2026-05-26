/** Demo identity — matches PP-000001 and flutter POP_VALIDATOR default. */
export const DEMO_LOCAL_USER_REF = 'demo-user-001'

/** Fallback demo auth user when Supabase ledger settle is enabled locally. */
export const DEFAULT_DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getPopValidatorBaseUrl(): string | null {
  const raw = import.meta.env.VITE_POP_VALIDATOR_URL?.trim()
  return raw || null
}

export function getAppBaseUrl(): string | null {
  const raw = import.meta.env.VITE_APP_BASE_URL?.trim()
  return raw || null
}

export function buildWalletDeepLink(sessionId: string): string | null {
  const base = getAppBaseUrl() ?? (typeof window !== 'undefined' ? window.location.origin : null)
  if (!base) return null
  const url = new URL(base)
  url.searchParams.set('proofSession', sessionId)
  return url.toString()
}

export function getDemoUserId(): string | null {
  const raw = import.meta.env.VITE_DEMO_USER_ID?.trim()
  if (!raw) return null
  return UUID_RE.test(raw) ? raw : null
}

export function resolveDemoUserId(authUserId?: string | null): string {
  if (authUserId && UUID_RE.test(authUserId)) return authUserId
  return getDemoUserId() ?? DEFAULT_DEMO_USER_ID
}

export function isLiveWalletEnabled(): boolean {
  return Boolean(getPopValidatorBaseUrl())
}

/** Map demo offer ids to POP settlement offer ids. */
export function resolveValidatorOfferId(offerId: string): string {
  if (offerId === 'nike-pegasus-41') return 'nike-pegasus-41-watch'
  if (offerId.endsWith('-watch')) return offerId
  return `${offerId}-watch`
}

export function isAutoSettleEnabled(): boolean {
  const raw = import.meta.env.VITE_AUTO_SETTLE?.trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes'
}
