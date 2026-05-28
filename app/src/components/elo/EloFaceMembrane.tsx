import type { EloExpressionState } from '../../lib/elo/types'

const ELO_MASK_SRC = '/media/elo-glass-mask.png'

export interface EloFaceMembraneProps {
  expression: EloExpressionState
  eyeScaleY: number
  emerged: boolean
  entering: boolean
}

/** Reference asset — translucent 3D glass face mask (Picture 2) */
export function EloFaceMembrane({ expression, eyeScaleY, emerged, entering }: EloFaceMembraneProps) {
  if (!emerged) return null

  const tilt = `rotateY(${expression.tiltY}deg) rotateX(${expression.tiltX}deg) scale(${1 + expression.nodPhase * 0.02})`

  return (
    <div
      className={`elo-membrane-wrap${entering ? ' elo-membrane-wrap--entering' : ''}`}
      style={{ opacity: expression.opacity }}
    >
      <div
        className="elo-glass-mask"
        style={{ transform: `perspective(900px) ${tilt} scaleY(${0.92 + (eyeScaleY - 0.85) * 0.15})` }}
        aria-hidden
      >
        <img className="elo-glass-mask__photo" src={ELO_MASK_SRC} alt="" draggable={false} />
      </div>
    </div>
  )
}
