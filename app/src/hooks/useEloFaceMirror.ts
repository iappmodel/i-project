import { useEffect, useMemo, useRef, useState } from 'react'
import { computeExpression } from '../lib/elo/expressionEngine'
import type { EloExpressionState, EloOrbState } from '../lib/elo/types'
import { useVision } from '../contexts/VisionContext'
import { useElo } from '../state/eloContext'

/** MediaPipe face mesh indices for contour lines */
const JAW_LINE = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356, 389, 251, 284, 332, 297, 338, 10, 109, 67, 103, 54, 21, 162, 127, 234]
const LEFT_BROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
const RIGHT_BROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
const NOSE_BRIDGE = [168, 6, 197, 195, 5, 4, 1]
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33]
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362]
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61]

export interface FaceContourPaths {
  jaw: string
  leftBrow: string
  rightBrow: string
  nose: string
  leftEye: string
  rightEye: string
  lips: string
}

function pathFromIndices(
  points: { x: number; y: number }[],
  indices: number[],
  mirrorX: boolean,
): string {
  const parts: string[] = []
  for (let i = 0; i < indices.length; i++) {
    const lm = points[indices[i]]
    if (!lm) continue
    const x = mirrorX ? 1 - lm.x : lm.x
    const y = lm.y
    parts.push(`${i === 0 ? 'M' : 'L'} ${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`)
  }
  return parts.join(' ')
}

function defaultContourPaths(idlePhase: number): FaceContourPaths {
  const cx = 50
  const cy = 50 + Math.sin(idlePhase) * 1.5
  return {
    jaw: `M ${cx - 22} ${cy + 8} Q ${cx - 28} ${cy + 28} ${cx} ${cy + 32} Q ${cx + 28} ${cy + 28} ${cx + 22} ${cy + 8}`,
    leftBrow: `M ${cx - 18} ${cy - 12} Q ${cx - 10} ${cy - 16} ${cx - 2} ${cy - 13}`,
    rightBrow: `M ${cx + 2} ${cy - 13} Q ${cx + 10} ${cy - 16} ${cx + 18} ${cy - 12}`,
    nose: `M ${cx} ${cy - 8} L ${cx} ${cy + 6}`,
    leftEye: `M ${cx - 14} ${cy - 4} Q ${cx - 10} ${cy - 6} ${cx - 6} ${cy - 4}`,
    rightEye: `M ${cx + 6} ${cy - 4} Q ${cx + 10} ${cy - 6} ${cx + 14} ${cy - 4}`,
    lips: `M ${cx - 8} ${cy + 14} Q ${cx} ${cy + 18} ${cx + 8} ${cy + 14}`,
  }
}

function landmarksToPaths(
  landmarks: { x: number; y: number }[],
): FaceContourPaths {
  return {
    jaw: pathFromIndices(landmarks, JAW_LINE, true),
    leftBrow: pathFromIndices(landmarks, LEFT_BROW, true),
    rightBrow: pathFromIndices(landmarks, RIGHT_BROW, true),
    nose: pathFromIndices(landmarks, NOSE_BRIDGE, true),
    leftEye: pathFromIndices(landmarks, LEFT_EYE, true),
    rightEye: pathFromIndices(landmarks, RIGHT_EYE, true),
    lips: pathFromIndices(landmarks, LIPS_OUTER, true),
  }
}

export function useEloFaceMirror(options: {
  orbState: EloOrbState
  attentionScore?: number
}) {
  const vision = useVision()
  const { config, room, emergence, evoked, orbState: ctxOrb } = useElo()
  const [idlePhase, setIdlePhase] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const tick = (t: number) => {
      setIdlePhase(t / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const vs = vision?.visionState
  const hasFace = vs?.hasFace ?? false
  const headYaw = vs?.headYaw ?? 0
  const headPitch = vs?.headPitch ?? 0
  const eyeOpenness = vs?.eyeOpenness ?? 0.85
  const landmarks = vs?.landmarks

  const expression = useMemo<EloExpressionState>(
    () =>
      computeExpression({
        hasFace,
        headYaw,
        headPitch,
        eyeOpenness,
        orbState: options.orbState ?? ctxOrb,
        room,
        stack: config.stack,
        activated: config.activated,
        evoked,
        emergence,
        attentionScore: options.attentionScore,
        idlePhase,
      }),
    [
      hasFace,
      headYaw,
      headPitch,
      eyeOpenness,
      options.orbState,
      ctxOrb,
      room,
      config.stack,
      config.activated,
      evoked,
      emergence,
      options.attentionScore,
      idlePhase,
    ],
  )

  const paths = useMemo(() => {
    if (landmarks && landmarks.length >= 468) {
      return landmarksToPaths(landmarks)
    }
    return defaultContourPaths(idlePhase)
  }, [landmarks, idlePhase])

  const eyeScaleY = expression.blinkScale

  return { expression, paths, eyeScaleY, hasFace }
}
