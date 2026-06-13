import { useState } from 'react'
import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { readGamification, spinWheel } from '../../lib/demoGamificationStore'

type Props = {
  open: boolean
  onClose: () => void
  onToast?: (msg: string) => void
}

export function ImmersiveSpinSheet({ open, onClose, onToast }: Props) {
  const [prize, setPrize] = useState<string | null>(null)
  const canSpin = readGamification().spin.canSpin

  return (
    <ImmersiveGlassSheet open={open} title="Daily spin" onClose={onClose}>
      <div className="spin-sheet">
        <div className="spin-sheet__wheel" aria-hidden>
          {prize ?? '◆'}
        </div>
        {prize ? <p className="spin-sheet__result mono">You won: {prize}</p> : null}
        <Button
          variant="secondary"
          disabled={!canSpin && !prize}
          onClick={() => {
            const r = spinWheel()
            setPrize(r.prize)
            onToast?.(r.prize)
          }}
        >
          {canSpin ? 'Spin' : 'Come back tomorrow'}
        </Button>
      </div>
    </ImmersiveGlassSheet>
  )
}
