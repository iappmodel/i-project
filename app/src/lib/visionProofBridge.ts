import { isWebVisionEnabled } from './visionEngine'

/** Client-side vision metrics attached to proof packets as hints only — not POPS truth. */
export type VisionProofHints = {
  source: 'mock' | 'web-vision'
  capturedAt: number
  hasFace: boolean
  livenessScore: number
  attentionScore: number
  gazeX: number | null
  gazeY: number | null
  visionStatus: string
  facePresentRatio: number
  notes: string
}

let latestSnapshot: VisionProofHints | null = null

export function publishVisionProofSnapshot(partial: Partial<Omit<VisionProofHints, 'source' | 'capturedAt'>>): void {
  if (!isWebVisionEnabled()) return
  latestSnapshot = {
    source: 'web-vision',
    capturedAt: Date.now(),
    hasFace: partial.hasFace ?? false,
    livenessScore: partial.livenessScore ?? 0,
    attentionScore: partial.attentionScore ?? 0,
    gazeX: partial.gazeX ?? null,
    gazeY: partial.gazeY ?? null,
    visionStatus: partial.visionStatus ?? 'idle',
    facePresentRatio: partial.facePresentRatio ?? (partial.hasFace ? 0.85 : 0),
    notes: partial.notes ?? 'web-vision-hints',
  }
}

export function getVisionProofHints(): VisionProofHints | null {
  if (!isWebVisionEnabled()) return null
  return latestSnapshot
}

export function clearVisionProofSnapshot(): void {
  latestSnapshot = null
}

export function visionProofSourceLabel(): 'mock' | 'web-vision' {
  return isWebVisionEnabled() && latestSnapshot?.source === 'web-vision' ? 'web-vision' : 'mock'
}

export function mergeVisionHintsIntoEyeTracking(
  base: Record<string, unknown>,
  hints: VisionProofHints | null,
): Record<string, unknown> {
  if (!hints) return base
  return {
    ...base,
    visionHintSource: hints.source,
    visionHintCapturedAt: hints.capturedAt,
    facePresentRatio: hints.facePresentRatio,
    livenessScore: hints.livenessScore,
    attentionScoreHint: hints.attentionScore,
    gazePosition:
      hints.gazeX != null && hints.gazeY != null
        ? { x: hints.gazeX, y: hints.gazeY }
        : base.gazePosition,
    verificationStabilitySnapshot: {
      ...(typeof base.verificationStabilitySnapshot === 'object' && base.verificationStabilitySnapshot
        ? base.verificationStabilitySnapshot
        : {}),
      reason: hints.notes,
      validFrameRatio: hints.hasFace ? Math.min(1, hints.facePresentRatio) : 0,
      confidenceBand: hints.attentionScore >= 70 ? 'STRONG' : hints.attentionScore >= 50 ? 'MODERATE' : 'WEAK',
    },
  }
}
