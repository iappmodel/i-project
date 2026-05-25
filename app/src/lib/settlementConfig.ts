/** Demo identity — matches PP-000001 and flutter POP_VALIDATOR default. */
export const DEMO_LOCAL_USER_REF = 'demo-user-001'

export function getPopValidatorBaseUrl(): string | null {
  const raw = import.meta.env.VITE_POP_VALIDATOR_URL?.trim()
  return raw || null
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
