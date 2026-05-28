import type { AttentionSession } from '../state/attentionSession'
import type { Offer } from '../state/types'
import {
  getVisionProofHints,
  mergeVisionHintsIntoEyeTracking,
  type VisionProofHints,
} from './visionProofBridge'
import { isWebVisionEnabled } from './visionEngine'
import { DEMO_LOCAL_USER_REF, resolveValidatorOfferId } from './settlementConfig'

export interface ProofPacketV0Json {
  packetVersion: '0'
  sessionId: string
  userId: null
  localUserRef: string
  offerId: string
  contentId: string
  deviceId: null
  deviceIdHash: string
  startedAt: string
  endedAt: string
  durationMs: number
  appVersion: string
  runtimeVersion: string
  signals: Record<string, { score: number; confidence: number; notes?: string }>
  eyeTracking: Record<string, unknown>
  interaction: Record<string, unknown>
  review: { status: 'pending'; reviewedAt: null; reasons: string[] }
}

/** Golden-path fixture shape — enough for POP validator approval. */
export function buildDemoProofPacket(input: {
  session: AttentionSession
  offer: Offer
  visionHints?: VisionProofHints | null
}): ProofPacketV0Json {
  const visionHints = input.visionHints ?? (isWebVisionEnabled() ? getVisionProofHints() : null)
  const runtimeVersion =
    visionHints?.source === 'web-vision' ? 'app/web-vision-hints@phase34' : 'app/mock-gaze@adr-014'
  const startedAt = new Date(input.session.createdAt).toISOString()
  const endedAt = new Date(input.session.validatedAt ?? Date.now()).toISOString()
  const durationMs = Math.max(
    1000,
    (input.session.validatedAt ?? Date.now()) - input.session.createdAt,
  )

  return {
    packetVersion: '0',
    sessionId: input.session.id,
    userId: null,
    localUserRef: DEMO_LOCAL_USER_REF,
    offerId: resolveValidatorOfferId(input.offer.id),
    contentId: `feed-card-${input.offer.id}`,
    deviceId: null,
    deviceIdHash: 'sha256:demo-web-shell',
    startedAt,
    endedAt,
    durationMs,
    appVersion: 'web-demo@0.1.0',
    runtimeVersion,
    signals: {
      presence: {
        score: visionHints?.hasFace ? Math.min(0.98, 0.75 + visionHints.livenessScore * 0.2) : 0.93,
        confidence: visionHints ? 0.88 : 0.9,
        notes: visionHints ? 'web-vision-hint' : 'demo-web-presence',
      },
      participation: { score: 0.92, confidence: 0.9, notes: 'playbackCompleted=true' },
      perception: { score: 0.78, confidence: 1.0, notes: 'centerDwellMet=true' },
      signalIntegrity: { score: 0.96, confidence: 1.0, notes: 'band=STRONG' },
      sessionIntegrity: { score: 1.0, confidence: 0.85, notes: 'foregroundRatio=1.00' },
      rewardEligibility: { score: 0.8, confidence: 0.75, notes: 'offerRulesMet=pending_review' },
    },
    eyeTracking: mergeVisionHintsIntoEyeTracking(
      {
      facePresentRatio: 0.9,
      stableGazeWindows: [
        { startedAtMs: 120400, endedAtMs: 125800, zone: 'CENTER', confidence: 0.82 },
      ],
      dwellEvents: [
        {
          zone: 'CENTER',
          startedAtMs: 118000,
          endedAtMs: 126500,
          satisfied: true,
        },
      ],
      blinkEvents: [{ timestampMs: Date.now(), detected: true }],
      verificationStabilitySnapshot: {
        stableZone: 'CENTER',
        confidenceBand: 'STRONG',
        validFrameRatio: 1.0,
        zoneConsistency: 1.0,
        dwellReadiness: 0.5625,
        blinkConfidence: 0.59,
        fpsConfidence: 0.84,
        reason: 'demo-web-shell',
        sampleCount: 48,
        windowMs: 1880,
      },
      calibrationConfidence: 0.71,
      invalidFrameRatio: 0.1,
      processedFpsAvg: 7.8,
    },
      visionHints,
    ),
    interaction: {
      taps: 2,
      scrolls: 0,
      playbackStarted: true,
      playbackCompleted: true,
      foregroundRatio: 1.0,
      interactionTiming: {
        firstInteractionMs: 4500,
        lastInteractionMs: Math.max(4500, durationMs - 2000),
        cadenceScore: 0.85,
      },
    },
    review: { status: 'pending', reviewedAt: null, reasons: [] },
  }
}
