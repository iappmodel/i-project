import { describe, expect, it } from 'vitest'
import { explainPendingHold } from './pendingRewardExplainer'
import type { PopPendingHold } from './popValidator'

const base: PopPendingHold = {
  sessionId: 'sess-1',
  localUserRef: 'demo-user',
  offerId: 'offer-watch',
  contentId: 'content-1',
  reviewStatus: 'approved',
  amount: 12,
  currency: 'icoin',
  holdStatus: 'pending',
  releaseStatus: 'held',
  releaseEligibleAt: null,
  appealExpiresAt: null,
  reverifyUsed: false,
  createdAt: '2026-06-02T12:00:00Z',
  settledAt: null,
}

describe('explainPendingHold', () => {
  it('describes appeal_pending with expiry', () => {
    const copy = explainPendingHold({
      ...base,
      holdStatus: 'appeal_pending',
      reviewStatus: 'escalated',
      appealExpiresAt: '2026-06-09T12:00:00Z',
    })
    expect(copy.headline).toContain('re-verify')
    expect(copy.lines.join(' ')).toContain('re-verify')
  })

  it('includes release window when present', () => {
    const copy = explainPendingHold({
      ...base,
      reviewStatus: 'pending',
      releaseEligibleAt: '2026-06-03T18:00:00Z',
    })
    expect(copy.lines.some((l) => l.includes('release'))).toBe(true)
  })
})
