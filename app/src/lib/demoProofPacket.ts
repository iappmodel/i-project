import type { AttentionSession } from '../state/attentionSession'
import { computeSessionAttentionScore } from '../state/attentionSession'
import type { Offer } from '../state/types'
import {
  getVisionProofHints,
  mergeVisionHintsIntoEyeTracking,
  type VisionProofHints,
} from './visionProofBridge'
import { isWebVisionEnabled } from './visionEngine'
import { DEMO_LOCAL_USER_REF, resolveValidatorOfferId } from './settlementConfig'
import { sanitizeEyeTrackingForProof } from './popPrivacyGate'

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

function scoreFromAttention(acsScore: number): {
  presence: number
  participation: number
  perception: number
  signalIntegrity: number
  sessionIntegrity: number
  rewardEligibility: number
} {
  const norm = Math.max(0, Math.min(1, acsScore / 100))
  const weak = norm < 0.55
  return {
    presence: Math.min(0.98, 0.6 + norm * 0.35),
    participation: weak ? 0.65 : Math.min(0.95, 0.7 + norm * 0.25),
    perception: Math.min(0.92, 0.45 + norm * 0.5),
    signalIntegrity: weak ? 0.55 : Math.min(0.98, 0.75 + norm * 0.2),
    sessionIntegrity: Math.min(1, 0.75 + norm * 0.25),
    rewardEligibility: weak ? 0.45 : Math.min(0.9, 0.5 + norm * 0.4),
  }
}

/** Build proof packet from session attention evidence (not a static golden fixture). */
export function buildDemoProofPacket(input: {
  session: AttentionSession
  offer: Offer
  visionHints?: VisionProofHints | null
}): ProofPacketV0Json {
  const visionHints = input.visionHints ?? (isWebVisionEnabled() ? getVisionProofHints() : null)
  const acsScore = computeSessionAttentionScore(input.session)
  const layerScores = scoreFromAttention(acsScore)
  const runtimeVersion =
    visionHints?.source === 'web-vision'
      ? 'app/web-vision-session@pop-finish'
      : 'app/session-evidence@pop-finish'
  const startedAt = new Date(input.session.createdAt).toISOString()
  const endedAt = new Date(input.session.validatedAt ?? Date.now()).toISOString()
  const durationMs = Math.max(
    1000,
    (input.session.validatedAt ?? Date.now()) - input.session.createdAt,
  )
  const sampleCount = input.session.attentionSamples?.length ?? 0
  const likelyFake =
    visionHints != null &&
    (!visionHints.hasFace || visionHints.livenessScore < 0.35)

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
        score: layerScores.presence,
        confidence: sampleCount >= 3 ? 0.88 : 0.65,
        notes: `sessionSamples=${sampleCount}`,
      },
      participation: {
        score: layerScores.participation,
        confidence: 0.85,
        notes: 'playbackCompleted=true',
      },
      perception: {
        score: layerScores.perception,
        confidence: Math.min(1, sampleCount / 10),
        notes: `acsScore=${acsScore}`,
      },
      signalIntegrity: {
        score: likelyFake ? 0.35 : layerScores.signalIntegrity,
        confidence: 0.9,
        notes: likelyFake ? 'fraud_hint=likelyFake' : 'session_evidence',
      },
      sessionIntegrity: {
        score: layerScores.sessionIntegrity,
        confidence: 0.85,
        notes: `watchDurationMs=${input.session.watchDurationMs ?? durationMs}`,
      },
      rewardEligibility: {
        score: likelyFake ? 0.2 : layerScores.rewardEligibility,
        confidence: 0.75,
        notes: likelyFake ? 'held_for_review' : 'offerRulesMet=pending_review',
      },
    },
    eyeTracking: sanitizeEyeTrackingForProof(
      mergeVisionHintsIntoEyeTracking(
        {
          facePresentRatio: layerScores.presence,
          likelyFake,
          attentionScoreHint: acsScore,
          peakAttentionScore: input.session.peakAttentionScore ?? acsScore,
          sampleCount,
          stableGazeWindows: [
            {
              startedAtMs: input.session.createdAt,
              endedAtMs: input.session.validatedAt ?? Date.now(),
              zone: 'CENTER',
              confidence: layerScores.perception,
            },
          ],
          dwellEvents: [
            {
              zone: 'CENTER',
              startedAtMs: input.session.createdAt,
              endedAtMs: input.session.validatedAt ?? Date.now(),
              satisfied: acsScore >= 55,
            },
          ],
          blinkEvents: [{ timestampMs: Date.now(), detected: true }],
          verificationStabilitySnapshot: {
            stableZone: 'CENTER',
            confidenceBand: acsScore >= 70 ? 'STRONG' : acsScore >= 50 ? 'MODERATE' : 'WEAK',
            validFrameRatio: layerScores.signalIntegrity,
            zoneConsistency: layerScores.perception,
            dwellReadiness: layerScores.participation,
            blinkConfidence: 0.59,
            fpsConfidence: 0.84,
            reason: runtimeVersion,
            sampleCount,
            windowMs: durationMs,
          },
          calibrationConfidence: 0.71,
          invalidFrameRatio: likelyFake ? 0.45 : Math.max(0, 1 - layerScores.presence),
          processedFpsAvg: 7.8,
        },
        visionHints,
      ),
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
        cadenceScore: layerScores.participation,
      },
    },
    review: { status: 'pending', reviewedAt: null, reasons: [] },
  }
}
