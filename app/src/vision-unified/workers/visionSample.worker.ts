type Landmark = { x: number; y: number }

interface WorkerConfig {
  minEarForBaseline?: number
  closeRatio?: number
  maxCloseEAR?: number
  reopenRatio?: number
  minBlinkDurationMs?: number
  maxBlinkDurationMs?: number
  blinkCooldownMs?: number
  minClosedFramesForBlink?: number
  baselineSampleCount?: number
  mirrorX?: boolean
  invertY?: boolean
  gazeScale?: number
  gazeSmoothing?: number
}

type VisionWorkerRequest =
  | { type: 'reset' }
  | {
      landmarks: Landmark[]
      timestamp?: number
      config?: WorkerConfig
    }

const LEFT_EYE: [number, number, number, number, number, number] = [33, 160, 158, 133, 153, 144]
const RIGHT_EYE: [number, number, number, number, number, number] = [362, 385, 387, 263, 373, 380]

const DEFAULTS: Required<WorkerConfig> = {
  minEarForBaseline: 0.12,
  closeRatio: 0.63,
  maxCloseEAR: 0.2,
  reopenRatio: 0.76,
  minBlinkDurationMs: 50,
  maxBlinkDurationMs: 800,
  blinkCooldownMs: 140,
  minClosedFramesForBlink: 1,
  baselineSampleCount: 8,
  mirrorX: true,
  invertY: false,
  gazeScale: 1.6,
  gazeSmoothing: 0.24,
}

let baselineEar: number | null = null
let baselineSamples: number[] = []
let isClosed = false
let closedAt = 0
let closedFrames = 0
let lastBlinkAt = 0
let leftClosed = false
let rightClosed = false
let gazeEma: { x: number; y: number } | null = null

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

const dist = (a: Landmark | undefined, b: Landmark | undefined) => {
  if (!a || !b) return 0
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const eyeEar = (landmarks: Landmark[], idx: [number, number, number, number, number, number]) => {
  const [p1, p2, p3, p4, p5, p6] = idx
  const horizontal = dist(landmarks[p1], landmarks[p4])
  if (horizontal <= 0) return 0
  const vertical = dist(landmarks[p2], landmarks[p6]) + dist(landmarks[p3], landmarks[p5])
  return vertical / (2 * horizontal)
}

const resetState = () => {
  baselineEar = null
  baselineSamples = []
  isClosed = false
  closedAt = 0
  closedFrames = 0
  lastBlinkAt = 0
  leftClosed = false
  rightClosed = false
  gazeEma = null
}

self.onmessage = (event: MessageEvent<VisionWorkerRequest>) => {
  const data = event.data
  if (!data) return
  if (data.type === 'reset') {
    resetState()
    return
  }
  if (!Array.isArray((data as { landmarks?: Landmark[] }).landmarks)) {
    return
  }

  const landmarks = (data as { landmarks: Landmark[]; config?: WorkerConfig; timestamp?: number }).landmarks
  if (landmarks.length < 468) return

  const ts = typeof data.timestamp === 'number' ? data.timestamp : Date.now()
  const cfg = { ...DEFAULTS, ...(data.config ?? {}) }

  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const point of landmarks) {
    if (typeof point.x !== 'number' || typeof point.y !== 'number') continue
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  const leftEAR = eyeEar(landmarks, LEFT_EYE)
  const rightEAR = eyeEar(landmarks, RIGHT_EYE)
  const ear = (leftEAR + rightEAR) / 2

  if (baselineEar === null) {
    if (ear >= cfg.minEarForBaseline) baselineSamples.push(ear)
    if (baselineSamples.length >= cfg.baselineSampleCount) {
      baselineSamples.sort((a, b) => a - b)
      baselineEar = baselineSamples[Math.floor(baselineSamples.length / 2)] ?? ear
    }
  } else if (ear >= cfg.minEarForBaseline * 0.9) {
    baselineEar = baselineEar * 0.95 + ear * 0.05
  }

  const refEar = baselineEar ?? Math.max(cfg.minEarForBaseline, ear)
  const closeThreshold = Math.min(refEar * cfg.closeRatio, cfg.maxCloseEAR)
  const reopenThreshold = refEar * cfg.reopenRatio

  let blinked = false
  if (ear <= closeThreshold) {
    if (!isClosed) closedAt = ts
    isClosed = true
    closedFrames += 1
  } else if (isClosed && ear >= reopenThreshold) {
    const duration = ts - closedAt
    const longEnough = closedFrames >= cfg.minClosedFramesForBlink
    const validDuration = duration >= cfg.minBlinkDurationMs && duration <= cfg.maxBlinkDurationMs
    const notCoolingDown = ts - lastBlinkAt > cfg.blinkCooldownMs
    blinked = longEnough && validDuration && notCoolingDown
    if (blinked) lastBlinkAt = ts
    isClosed = false
    closedFrames = 0
  } else {
    closedFrames = 0
  }

  const leftClose = leftEAR <= closeThreshold
  const rightClose = rightEAR <= closeThreshold
  const leftWink = leftClose && !rightClose && !leftClosed
  const rightWink = rightClose && !leftClose && !rightClosed
  leftClosed = leftClose
  rightClosed = rightClose

  const leftOuter = landmarks[33]
  const rightOuter = landmarks[263]
  const leftInner = landmarks[133]
  const rightInner = landmarks[362]
  const noseTip = landmarks[1]
  const forehead = landmarks[10]
  const chin = landmarks[152]
  const mouthUpper = landmarks[13]
  const mouthLower = landmarks[14]

  const eyeMidX = (leftOuter.x + rightOuter.x) / 2
  const eyeMidY = (leftOuter.y + rightOuter.y) / 2
  const mouthMidY = (mouthUpper.y + mouthLower.y) / 2

  const yawNorm = (noseTip.x - eyeMidX) / Math.max(0.01, Math.abs(rightOuter.x - leftOuter.x))
  const pitchNorm = (noseTip.y - (eyeMidY + mouthMidY) / 2) / Math.max(0.01, Math.abs(chin.y - forehead.y))
  const headYaw = Math.max(-35, Math.min(35, yawNorm * 60))
  const headPitch = Math.max(-30, Math.min(30, pitchNorm * 55))

  const eyeCenterX = (leftInner.x + rightInner.x) / 2
  const eyeCenterY = (leftInner.y + rightInner.y) / 2
  const rawGazeX = clamp01(0.5 + (eyeCenterX - eyeMidX) * cfg.gazeScale * 2)
  const rawGazeY = clamp01(0.5 + (eyeCenterY - eyeMidY) * cfg.gazeScale * 2)
  const normalized = {
    x: cfg.mirrorX ? 1 - rawGazeX : rawGazeX,
    y: cfg.invertY ? 1 - rawGazeY : rawGazeY,
  }
  const smoothing = clamp01(cfg.gazeSmoothing)
  gazeEma = gazeEma
    ? {
        x: gazeEma.x * smoothing + normalized.x * (1 - smoothing),
        y: gazeEma.y * smoothing + normalized.y * (1 - smoothing),
      }
    : normalized

  self.postMessage({
    hasFace: true,
    faceBox: { x: minX, y: minY, w: Math.max(0.01, maxX - minX), h: Math.max(0.01, maxY - minY) },
    ear,
    leftEAR,
    rightEAR,
    eyeOpenness: clamp01(refEar > 0 ? ear / refEar : 1),
    gazePosition: gazeEma,
    headYaw,
    headPitch,
    baselineReady: baselineEar !== null,
    blinked,
    leftWink,
    rightWink,
  })
}
