import { describe, expect, it } from 'vitest'
import { buildDemoProofPacket } from './demoProofPacket'
import {
  findForbiddenProofKeys,
  proofJsonPassesPrivacyGate,
  sanitizeEyeTrackingForProof,
} from './popPrivacyGate'
import { createAttentionSession, recordAttentionSample } from '../state/attentionSession'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'

describe('popPrivacyGate', () => {
  it('detects landmarks in nested JSON', () => {
    expect(findForbiddenProofKeys({ eyeTracking: { landmarks: [] } })).toContain(
      '$.eyeTracking.landmarks',
    )
  })

  it('demo proof packet passes privacy gate', () => {
    let session = createAttentionSession('offer-1')
    session = recordAttentionSample(session, 80)
    const packet = buildDemoProofPacket({ session, offer: DEFAULT_SPONSORED_OFFER })
    expect(proofJsonPassesPrivacyGate(packet as unknown as Record<string, unknown>)).toBe(
      true,
    )
    expect(packet.eyeTracking.landmarks).toBeUndefined()
  })

  it('sanitize removes gazePosition stream', () => {
    const out = sanitizeEyeTrackingForProof({
      gazePosition: { x: 0.1, y: 0.2 },
      facePresentRatio: 0.9,
    })
    expect(out.gazePosition).toBeUndefined()
    expect(out.derivedOnly).toBe(true)
  })
})
