import { useState } from 'react'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { Button } from '../Button'

type Props = {
  open: boolean
  onClose: () => void
  onToast?: (msg: string) => void
}

export function ImmersiveRouteBuilderSheet({ open, onClose, onToast }: Props) {
  const [stops, setStops] = useState(['Cafe promo', 'Retail brief', 'Local gym'])

  return (
    <ImmersiveGlassSheet open={open} title="Promo route" onClose={onClose}>
      <ol className="route-sheet__list">
        {stops.map((s, i) => (
          <li key={i} className="route-sheet__item">
            <span className="route-sheet__num mono">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <Button
        variant="secondary"
        onClick={() => {
          setStops((prev) => [...prev, `Stop ${prev.length + 1}`])
          onToast?.('Stop added (demo)')
        }}
      >
        Add stop
      </Button>
    </ImmersiveGlassSheet>
  )
}
