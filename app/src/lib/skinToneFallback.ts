export interface SkinToneFallbackResult {
  confidenceScore: number
  movementScore: number
  isLikelyHuman: boolean
}

export function analyzeSkinToneFrame(
  imageData: ImageData,
  prevFrameRef: { data: Uint8ClampedArray | null },
): SkinToneFallbackResult {
  const prev = prevFrameRef.data
  let diffSum = 0

  if (prev && prev.length === imageData.data.length) {
    const stride = 16
    for (let i = 0; i < imageData.data.length; i += stride) {
      diffSum += Math.abs(imageData.data[i] - prev[i]!)
    }
  }

  prevFrameRef.data = imageData.data.slice(0)
  const movementScore = Math.max(0, Math.min(1, diffSum / 50000))

  return {
    confidenceScore: 0.75,
    movementScore,
    isLikelyHuman: movementScore > 0.02,
  }
}
