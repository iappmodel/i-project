export interface VisionResidualSample {
  observedX: number
  observedY: number
  expectedX: number
  expectedY: number
}

export interface VisionResidualModel {
  samples: VisionResidualSample[]
  maxSamples: number
}

export const DEFAULT_RESIDUAL_MODEL: VisionResidualModel = {
  samples: [],
  maxSamples: 80,
}

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function normalizeResidualModel(value: unknown): VisionResidualModel {
  if (!value || typeof value !== 'object') return { ...DEFAULT_RESIDUAL_MODEL }
  const obj = value as { samples?: unknown; maxSamples?: unknown }
  const samples = Array.isArray(obj.samples)
    ? obj.samples
        .filter((s): s is VisionResidualSample => {
          if (!s || typeof s !== 'object') return false
          const item = s as Record<string, unknown>
          return (
            isFiniteNum(item.observedX) &&
            isFiniteNum(item.observedY) &&
            isFiniteNum(item.expectedX) &&
            isFiniteNum(item.expectedY)
          )
        })
        .slice(0, 400)
    : []
  const maxSamples = isFiniteNum(obj.maxSamples) ? Math.max(20, Math.min(500, Math.round(obj.maxSamples))) : 80
  return { samples, maxSamples }
}
