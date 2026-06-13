const KEY = 'i-demo-referral-v1'

export function readReferralCode(): string {
  try {
    const existing = localStorage.getItem(KEY)
    if (existing) return existing
    const code = `i-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    localStorage.setItem(KEY, code)
    return code
  } catch {
    return 'i-DEMO01'
  }
}
