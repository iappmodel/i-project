import { describe, expect, it, vi } from 'vitest'
import { buildDemoProofPacket } from './demoProofPacket'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import { submitProofPacket, settlePendingHold } from './popValidator'

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
      await expect(submitProofPacket(packet)).rejects.toThrow('pop_m5_proof_submission_disabled')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('rejects a rebranded demo packet as well as the original', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      const packet = buildDemoProofPacket({
        offer: DEFAULT_SPONSORED_OFFER,
        session: {
          id: 'session_rebranded_0001',
          offerId: DEFAULT_SPONSORED_OFFER.id,
          status: 'validated',
          createdAt: Date.now() - 5000,
          validatedAt: Date.now(),
          attentionSamples: [],
        },
      })
      packet.appVersion = 'claimed-native@1.0'
      packet.deviceIdHash = 'sha256:pretend-certified'
      await expect(submitProofPacket(packet, 'art-123')).rejects.toThrow('pop_m5_proof_submission_disabled')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('blocks direct hold settlement even when a server URL could be configured', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    try {
      await expect(settlePendingHold('session-test', 'user-test')).rejects.toThrow('pop_m5_settlement_disabled')
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

})
