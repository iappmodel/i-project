import { useState } from 'react'
import { BackRow } from '../components/BackRow'
import { PhoneFrame } from '../components/PhoneFrame'
import { Button } from '../components/Button'
import { useDemo } from '../state/useDemo'

export function ImmersiveStudioScreen() {
  const { setScreen } = useDemo()
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(100)

  return (
    <PhoneFrame scroll>
      <BackRow label="Create" onBack={() => setScreen('immersive-create')} />
      <h1 className="screen-title">Studio</h1>
      <p className="screen-sub">Glass timeline · in-memory trim (demo)</p>
      <div className="studio-timeline">
        <div className="studio-timeline__track">
          <span className="studio-timeline__fill" style={{ width: `${trimEnd - trimStart}%`, marginLeft: `${trimStart}%` }} />
        </div>
        <label className="studio-timeline__label">
          Start {trimStart}%
          <input type="range" min={0} max={90} value={trimStart} onChange={(e) => setTrimStart(Number(e.target.value))} />
        </label>
        <label className="studio-timeline__label">
          End {trimEnd}%
          <input type="range" min={10} max={100} value={trimEnd} onChange={(e) => setTrimEnd(Number(e.target.value))} />
        </label>
      </div>
      <Button variant="secondary" onClick={() => setScreen('immersive-feed')}>
        Publish to feed (demo)
      </Button>
    </PhoneFrame>
  )
}
