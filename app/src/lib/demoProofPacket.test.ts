import { describe, expect, it } from 'vitest'
import { buildDemoProofPacket } from './demoProofPacket'
import {
  computeSessionAttentionScore,
  createAttentionSession,
  recordAttentionSample,
} from '../state/attentionSession'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import type { PopDemoLiteTelemetry } from './popDemoLite/types'

describe('attentionSession evidence', () => {
  it('computes average attention score from samples', () => {
    let session = createAttentionSession('offer-1')
    session = recordAttentionSample(session, 60)
    session = recordAttentionSample(session, 80)
    expect(computeSessionAttentionScore(session)).toBe(70)
  })
})

describe('buildDemoProofPacket', () => {
  it('derives layer scores from session evidence not static fixture', () => {
    let session = createAttentionSession('offer-1')
    session = recordAttentionSample(session, 85)
    session = recordAttentionSample(session, 90)
    session = { ...session, status: 'validated', validatedAt: Date.now(), acsScore: 88 }

    const packet = buildDemoProofPacket({ session, offer: DEFAULT_SPONSORED_OFFER })
    expect(packet.signals.perception.notes).toContain('acsScore=88')
    expect(packet.eyeTracking.attentionScoreHint).toBe(88)
    expect(packet.review.status).toBe('pending')
    expect(packet.eyeTracking.derivedOnly).toBe(true)
    expect('landmarks' in packet.eyeTracking).toBe(false)
  })

  it('merges demo lite telemetry into perception notes and attention hint', () => {
    let session = createAttentionSession('offer-1')
    session = recordAttentionSample(session, 70)
    session = { ...session, status: 'validated', validatedAt: Date.now(), acsScore: 72 }

    const demoLiteTelemetry: PopDemoLiteTelemetry = {
      sessionId: session.id,
      voiceCommand: 'like',
      voiceTranscript: 'like this',
      gestureTriggers: ['bothBlink', 'bothBlink'],
      gazeSamples: 8,
      gazeEngagedRatio: 0.75,
      fusionAttentionScore: 81,
      channelHints: { eyes: true, gesture: true, voice: true },
    }

    const packet = buildDemoProofPacket({
      session,
      offer: DEFAULT_SPONSORED_OFFER,
      demoLiteTelemetry,
    })

    expect(packet.eyeTracking.attentionScoreHint).toBe(81)
    expect(packet.signals.perception.notes).toContain('demoLite=eyes+gesture+voice')
    expect(packet.runtimeVersion).toContain('@pop-demo-lite')
    expect(packet.interaction.taps).toBeGreaterThanOrEqual(2)
  })
})
