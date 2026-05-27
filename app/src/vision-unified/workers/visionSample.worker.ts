type Landmark = { x: number; y: number }

type VisionWorkerRequest =
  | { type: 'reset' }
  | {
      landmarks: Landmark[]
    }

self.onmessage = (event: MessageEvent<VisionWorkerRequest>) => {
  const data = event.data
  if (!data || data.type === 'reset' || !Array.isArray((data as { landmarks?: Landmark[] }).landmarks)) {
    return
  }

  const landmarks = (data as { landmarks: Landmark[] }).landmarks
  if (landmarks.length === 0) return

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

  self.postMessage({
    hasFace: true,
    faceBox: { x: minX, y: minY, w: Math.max(0.01, maxX - minX), h: Math.max(0.01, maxY - minY) },
    ear: 0.24,
    leftEAR: 0.24,
    rightEAR: 0.24,
    eyeOpenness: 1,
    gazePosition: { x: 0.5, y: 0.5 },
    headYaw: 0,
    headPitch: 0,
    baselineReady: true,
    blinked: false,
    leftWink: false,
    rightWink: false,
  })
}
