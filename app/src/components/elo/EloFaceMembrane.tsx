import type { FaceContourPaths } from '../../hooks/useEloFaceMirror'
import type { EloExpressionState } from '../../lib/elo/types'

export interface EloFaceMembraneProps {
  expression: EloExpressionState
  paths: FaceContourPaths
  eyeScaleY: number
  emerged: boolean
  entering: boolean
}

/** Living presence membrane — procedural glass contours, POP-mirrored when camera active */
export function EloFaceMembrane({
  expression,
  paths,
  eyeScaleY,
  emerged,
  entering,
}: EloFaceMembraneProps) {
  if (!emerged) return null

  const tilt = `rotateY(${expression.tiltY}deg) rotateX(${expression.tiltX}deg) scale(${1 + expression.nodPhase * 0.02})`
  const pathClass = entering
    ? 'elo-membrane__path elo-membrane__path--emerge'
    : 'elo-membrane__path elo-membrane__path--idle'

  return (
    <div
      className={`elo-membrane-wrap${entering ? ' elo-membrane-wrap--entering' : ''}`}
      style={{
        opacity: expression.opacity,
        ['--elo-line-color' as string]: expression.lineColor,
        ['--elo-pulse-speed' as string]: String(expression.pulseSpeed),
      }}
    >
      <div
        className="elo-membrane-surface"
        style={{
          transform: `perspective(900px) ${tilt} scaleY(${0.92 + (eyeScaleY - 0.85) * 0.15})`,
        }}
        aria-hidden
      >
        <div className="elo-membrane-halo" />
        <svg className="elo-membrane__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="elo-face-fill" cx="50%" cy="40%" r="42%">
              <stop offset="0%" stopColor="rgba(210, 230, 255, 0.16)" />
              <stop offset="70%" stopColor="rgba(180, 210, 255, 0.05)" />
              <stop offset="100%" stopColor="rgba(180, 210, 255, 0)" />
            </radialGradient>
            <filter id="elo-line-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <ellipse cx="50" cy="48" rx="27" ry="33" fill="url(#elo-face-fill)" />
          <path className={`${pathClass} elo-membrane__path--jaw`} d={paths.jaw} filter="url(#elo-line-glow)" />
          <path className={pathClass} d={paths.leftBrow} />
          <path className={pathClass} d={paths.rightBrow} />
          <path className={pathClass} d={paths.nose} />
          <path className={pathClass} d={paths.leftEye} />
          <path className={pathClass} d={paths.rightEye} />
          <path className={pathClass} d={paths.lips} />
        </svg>
      </div>
    </div>
  )
}
