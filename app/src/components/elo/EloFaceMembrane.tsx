import type { EloExpressionState } from '../../lib/elo/types'
import type { FaceContourPaths } from '../../hooks/useEloFaceMirror'

export interface EloFaceMembraneProps {
  expression: EloExpressionState
  paths: FaceContourPaths
  eyeScaleY: number
  emerged: boolean
  orbGlowClass?: string
}

export function EloFaceMembrane({
  expression,
  paths,
  eyeScaleY,
  emerged,
  orbGlowClass,
}: EloFaceMembraneProps) {
  if (!emerged) return null

  const transform = `translate(-50%, -50%) perspective(600px) rotateY(${expression.tiltY}deg) rotateX(${expression.tiltX}deg)`
  const emergeClass =
    expression.emergence >= 0.95 ? 'elo-membrane__path--idle' : 'elo-membrane__path--emerge'

  return (
    <div
      className="elo-membrane"
      style={{
        opacity: expression.opacity,
        transform,
        ['--elo-line-color' as string]: expression.lineColor,
        ['--elo-pulse-speed' as string]: String(expression.pulseSpeed),
      }}
    >
      {orbGlowClass ? <div className={`elo-membrane-glow ${orbGlowClass}`} aria-hidden /> : null}
      <svg
        className="elo-membrane__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <g style={{ transform: `scaleY(${eyeScaleY})`, transformOrigin: '50% 45%' }}>
          <path className={`elo-membrane__path ${emergeClass}`} d={paths.jaw} />
          <path className={`elo-membrane__path ${emergeClass}`} d={paths.leftBrow} />
          <path className={`elo-membrane__path ${emergeClass}`} d={paths.rightBrow} />
          <path className={`elo-membrane__path ${emergeClass}`} d={paths.nose} />
          <path className={`elo-membrane__path ${emergeClass}`} d={paths.leftEye} />
          <path className={`elo-membrane__path ${emergeClass}`} d={paths.rightEye} />
          <path className={`elo-membrane__path ${emergeClass}`} d={paths.lips} />
        </g>
      </svg>
    </div>
  )
}
