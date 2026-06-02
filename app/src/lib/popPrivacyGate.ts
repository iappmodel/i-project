/** Forbidden proof-packet keys — must never leave device (POP Stage 9). */
export const FORBIDDEN_PROOF_KEYS = new Set([
  'landmarks',
  'fullLandmarks',
  'mesh',
  'yPlane',
  'y8',
  'jpegBytes',
  'frameBytes',
  'rawGazeStream',
  'cameraFrame',
  'bitmap',
])

export function findForbiddenProofKeys(
  value: unknown,
  path = '$',
): string[] {
  const hits: string[] = []
  if (value == null || typeof value !== 'object') return hits
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      hits.push(...findForbiddenProofKeys(item, `${path}[${i}]`))
    })
    return hits
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}.${key}`
    if (FORBIDDEN_PROOF_KEYS.has(key)) hits.push(childPath)
    hits.push(...findForbiddenProofKeys(child, childPath))
  }
  return hits
}

export function proofJsonPassesPrivacyGate(json: Record<string, unknown>): boolean {
  return findForbiddenProofKeys(json).length === 0
}

/** Strip web-vision point hints; keep derived aggregates only. */
export function sanitizeEyeTrackingForProof(
  eyeTracking: Record<string, unknown>,
): Record<string, unknown> {
  const { gazePosition: _gaze, landmarks: _lm, ...rest } = eyeTracking
  return {
    ...rest,
    derivedOnly: true,
  }
}
