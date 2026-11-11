import { describe, expect, it, vi } from 'vitest'
import { buildDemoProofPacket } from './demoProofPacket'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import { submitProofPacket } from './popValidator'

describe('POP V10 demo evidence authority boundary', () => {
  it('rejects generated investor proof before any validator network submission', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      const now = Date.now()
      const packet = buildDemoProofPacket({
        offer: DEFAULT_SPONSORED_OFFER,
        session: {
          id: 'session_fixture_0001',
          offerId: DEFAULT_SPONSORED_OFFER.id,
          status: 'validated',
          createdAt: now - 10000,
          validatedAt: now,
          attentionSamples: [{ t: now - 500, score: 90 }],
          peakAttentionScore: 90,
        },
      })
      await expect(submitProofPacket(packet)).rejects.toThrow('demo_proof_not_authorized_for_validator')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
