import { useId } from 'react'
import type { FaceContourPaths, FaceEyeCenters } from '../../hooks/useEloFaceMirror'
import type { EloExpressionState, EloVisualForm } from '../../lib/elo/types'

const CONTOUR_KEYS: (keyof FaceContourPaths)[] = [
  'jaw',
  'leftBrow',
  'rightBrow',
  'nose',
  'leftEye',
  'rightEye',
  'lips',
]

export interface EloFaceMembraneProps {
  expression: EloExpressionState
  paths: FaceContourPaths
  eyeCenters: FaceEyeCenters
  eyeScaleY: number
  visualForm: EloVisualForm
  speechEnergy: number
  emerged: boolean
  entering: boolean
}

/** Living presence membrane — procedural glass contours, POP-mirrored when camera active */
export function EloFaceMembrane({
  expression,
  paths,
  eyeCenters,
  eyeScaleY,
  visualForm,
  speechEnergy,
  emerged,
  entering,
}: EloFaceMembraneProps) {
  const uid = useId().replace(/:/g, '')
  const fillId = `elo-face-fill-${uid}`
  const glowId = `elo-line-glow-${uid}`
  const cheekId = `elo-cheek-${uid}`

  if (!emerged) return null

  const tilt = `rotateY(${expression.tiltY}deg) rotateX(${expression.tiltX}deg) scale(${1 + expression.nodPhase * 0.02})`
  const pathClass = entering
    ? 'elo-membrane__path elo-membrane__path--emerge'
    : 'elo-membrane__path elo-membrane__path--idle'
  const formClass = `elo-membrane-wrap--${visualForm}`
  const speakingClass = speechEnergy > 0.15 ? ' elo-membrane-wrap--speaking' : ''
  const showDetail = visualForm === 'lineFace'
  const showAbstract = visualForm === 'abstract'
  const showLight = visualForm === 'lightForm'
  const showSymbol = visualForm === 'symbol'
  const socketRy = 4.2 * eyeScaleY

  return (
    <div
      className={`elo-membrane-wrap${entering ? ' elo-membrane-wrap--entering' : ''} ${formClass}${speakingClass}`}
      style={{
        opacity: expression.opacity,
        ['--elo-line-color' as string]: expression.lineColor,
        ['--elo-pulse-speed' as string]: String(expression.pulseSpeed),
        ['--elo-speech-energy' as string]: String(speechEnergy),
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
        <div className="elo-membrane-glass-base" />
        <svg className="elo-membrane__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id={fillId} cx="50%" cy="38%" r="48%">
              <stop offset="0%" stopColor="rgba(230, 245, 255, 0.22)" />
              <stop offset="55%" stopColor="rgba(190, 220, 255, 0.08)" />
              <stop offset="100%" stopColor="rgba(160, 200, 255, 0)" />
            </radialGradient>
            <radialGradient id={cheekId} cx="50%" cy="55%" r="50%">
              <stop offset="0%" stopColor="rgba(0, 0, 0, 0)" />
              <stop offset="72%" stopColor="rgba(0, 0, 0, 0.06)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0.14)" />
            </radialGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {showSymbol ? (
            <>
              <circle className="elo-membrane__symbol-ring" cx="50" cy="48" r="28" />
              <circle className="elo-membrane__symbol-eye" cx={eyeCenters.left.x} cy={eyeCenters.left.y} r="2.2" />
              <circle className="elo-membrane__symbol-eye" cx={eyeCenters.right.x} cy={eyeCenters.right.y} r="2.2" />
            </>
          ) : (
            <>
              <ellipse cx="50" cy="48" rx="28" ry="33" fill={`url(#${fillId})`} />
              <ellipse cx="50" cy="52" rx="26" ry="30" fill={`url(#${cheekId})`} />
              <ellipse className="elo-membrane__highlight" cx="50" cy="32" rx="14" ry="8" />
              <ellipse
                className="elo-membrane__socket"
                cx={eyeCenters.left.x}
                cy={eyeCenters.left.y}
                rx="5.5"
                ry={socketRy}
              />
              <ellipse
                className="elo-membrane__socket"
                cx={eyeCenters.right.x}
                cy={eyeCenters.right.y}
                rx="5.5"
                ry={socketRy}
              />
              {(showDetail || showAbstract) &&
                CONTOUR_KEYS.map((key) => (
                  <path
                    key={`ghost-${key}`}
                    className="elo-membrane__path elo-membrane__path--ghost"
                    d={paths[key]}
                  />
                ))}
              {(showDetail || showAbstract) && (
                <path className={`${pathClass} elo-membrane__path--jaw`} d={paths.jaw} filter={`url(#${glowId})`} />
              )}
              {showDetail &&
                CONTOUR_KEYS.filter((key) => key !== 'jaw').map((key) => (
                  <path key={key} className={pathClass} d={paths[key]} />
                ))}
              {showAbstract && (
                <>
                  <path className={pathClass} d={paths.leftEye} />
                  <path className={pathClass} d={paths.rightEye} />
                </>
              )}
            </>
          )}
        </svg>
        {showLight ? <div className="elo-membrane-light-veil" /> : null}
      </div>
    </div>
  )
}
