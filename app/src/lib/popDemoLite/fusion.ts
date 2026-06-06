/** Fuse session ACS with demo-lite multi-signal hints (eyes + gesture + voice). */
export function computeFusionAttentionScore(
  acsScore: number,
  input: {
    gazeEngagedRatio: number
    gestureCount: number
    voiceCommand: string | null
  },
): number {
  const gazePart = input.gazeEngagedRatio * 30
  const gesturePart = Math.min(25, input.gestureCount * 5)
  const voicePart = input.voiceCommand ? 15 : 0
  const multi = (gazePart + gesturePart + voicePart) / 3
  const fused = acsScore * 0.55 + multi * 0.45
  return Math.round(Math.max(0, Math.min(100, fused)))
}
