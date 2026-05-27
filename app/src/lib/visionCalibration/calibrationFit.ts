import {
  applyResidualCompensation,
  fitResidualModel,
  type ResidualTrainingSample,
} from './residualModel'
import {
  normalizeVisionCalibration,
  type VisionCalibrationProfile,
  type VisionDeviceClass,
} from './profile'

export type AffineParams = [number, number, number, number, number, number]

export interface GazeSample {
  targetX: number
  targetY: number
  gazeX: number
  gazeY: number
}

export interface GestureChecks {
  singleBlink: boolean
  handPinch: boolean
  doubleBlink?: boolean
  headNod?: boolean
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const solve3x3 = (M: number[][], v: number[]): [number, number, number] | null => {
  const a = M.map((row) => [...row])
  const b = [...v]
  for (let col = 0; col < 3; col += 1) {
    let maxRow = col
    for (let r = col + 1; r < 3; r += 1) {
      if (Math.abs(a[r][col]) > Math.abs(a[maxRow][col])) maxRow = r
    }
    ;[a[col], a[maxRow]] = [a[maxRow], a[col]]
    ;[b[col], b[maxRow]] = [b[maxRow], b[col]]
    if (Math.abs(a[col][col]) < 1e-10) return null
    for (let r = col + 1; r < 3; r += 1) {
      const factor = a[r][col] / a[col][col]
      for (let c = col; c < 3; c += 1) a[r][c] -= factor * a[col][c]
      b[r] -= factor * b[col]
    }
  }
  const x = [0, 0, 0]
  for (let i = 2; i >= 0; i -= 1) {
    let sum = b[i]
    for (let j = i + 1; j < 3; j += 1) sum -= a[i][j] * x[j]
    x[i] = sum / a[i][i]
  }
  return [x[0], x[1], x[2]]
}

const fitAffine = (samples: GazeSample[]): AffineParams | null => {
  if (samples.length < 4) return null
  const AtA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  const AtbX = [0, 0, 0]
  const AtbY = [0, 0, 0]

  for (const sample of samples) {
    const row = [sample.gazeX, sample.gazeY, 1]
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) AtA[i][j] += row[i] * row[j]
      AtbX[i] += row[i] * sample.targetX
      AtbY[i] += row[i] * sample.targetY
    }
  }

  const abc = solve3x3(AtA, AtbX)
  const def = solve3x3(AtA, AtbY)
  return abc && def ? ([...abc, ...def] as AffineParams) : null
}

const applyAffine = (params: AffineParams, x: number, y: number) => ({
  x: clamp01(params[0] * x + params[1] * y + params[2]),
  y: clamp01(params[3] * x + params[4] * y + params[5]),
})

const applyBaseCalibration = (calibration: VisionCalibrationProfile, rawX: number, rawY: number) => {
  if (calibration.affineParams && calibration.affineParams.length === 6) {
    return applyAffine(calibration.affineParams, rawX, rawY)
  }
  return {
    x: clamp01((rawX - 0.5) * calibration.scaleX + 0.5 + calibration.offsetX),
    y: clamp01((rawY - 0.5) * calibration.scaleY + 0.5 + calibration.offsetY),
  }
}

export function buildVisionCalibration(
  existing: VisionCalibrationProfile,
  samples: GazeSample[],
  gestures: GestureChecks,
): VisionCalibrationProfile {
  let next: VisionCalibrationProfile = { ...existing }

  const affine = fitAffine(samples)
  if (affine) {
    next = {
      ...next,
      offsetX: 0,
      offsetY: 0,
      scaleX: 1,
      scaleY: 1,
      affineParams: affine,
    }
  } else if (samples.length > 0) {
    const avgGazeX = samples.reduce((acc, s) => acc + s.gazeX, 0) / samples.length
    const avgGazeY = samples.reduce((acc, s) => acc + s.gazeY, 0) / samples.length
    const avgTargetX = samples.reduce((acc, s) => acc + s.targetX, 0) / samples.length
    const avgTargetY = samples.reduce((acc, s) => acc + s.targetY, 0) / samples.length
    next = {
      ...next,
      offsetX: avgTargetX - avgGazeX,
      offsetY: avgTargetY - avgGazeY,
      scaleX: 1,
      scaleY: 1,
      affineParams: undefined,
    }
  }

  const residualSamples: ResidualTrainingSample[] = samples.map((sample) => {
    const base = applyBaseCalibration(next, sample.gazeX, sample.gazeY)
    const distance = Math.hypot(base.x - sample.targetX, base.y - sample.targetY)
    const weight = Math.max(0.2, Math.min(1.2, 1.2 - distance * 2))
    return {
      inputX: base.x,
      inputY: base.y,
      targetX: sample.targetX,
      targetY: sample.targetY,
      weight,
    }
  })

  const residualModel = fitResidualModel(residualSamples, {
    lambda: 0.05,
    minSamples: existing.deviceClass === 'desktop' ? 5 : 4,
  })
  if (residualModel) {
    next = { ...next, residualModel }
  }

  const qualityError = samples.length
    ? samples.reduce((acc, sample) => {
        const base = applyBaseCalibration(next, sample.gazeX, sample.gazeY)
        const corrected = applyResidualCompensation(base.x, base.y, next.residualModel)
        const err = Math.hypot(corrected.x - sample.targetX, corrected.y - sample.targetY)
        return acc + err
      }, 0) / samples.length
    : 0.25

  const mandatoryGestureScore = Number(gestures.singleBlink) * 0.5 + Number(gestures.handPinch) * 0.5
  const bonusGestureScore =
    (Number(gestures.doubleBlink) + Number(gestures.headNod)) / 6

  const profileQuality = clamp01(
    (1 - qualityError / 0.28) * 0.82 + mandatoryGestureScore * 0.14 + bonusGestureScore,
  )
  const easierMode = mandatoryGestureScore < 1

  return normalizeVisionCalibration({
    ...next,
    isCalibrated: true,
    calibratedAt: Date.now(),
    profileQuality,
    handPinchMinConfidence: easierMode
      ? Math.max(0.48, next.handPinchMinConfidence - 0.06)
      : next.handPinchMinConfidence,
    handPointMinConfidence: easierMode
      ? Math.max(0.52, next.handPointMinConfidence - 0.06)
      : next.handPointMinConfidence,
    handOpenPalmMinConfidence: easierMode
      ? Math.max(0.48, next.handOpenPalmMinConfidence - 0.06)
      : next.handOpenPalmMinConfidence,
    headYawCommandThreshold: easierMode
      ? next.headYawCommandThreshold + 2
      : next.headYawCommandThreshold,
    nodRangeThreshold: easierMode ? next.nodRangeThreshold + 1 : next.nodRangeThreshold,
    version: 2,
  })
}

export function getCalibrationCapturePreset(deviceClass?: VisionDeviceClass) {
  if (deviceClass === 'iphone') return { holdMs: 340, cooldownMs: 220, targetRadius: 0.115 }
  if (deviceClass === 'android') return { holdMs: 420, cooldownMs: 260, targetRadius: 0.12 }
  return { holdMs: 320, cooldownMs: 210, targetRadius: 0.1 }
}
