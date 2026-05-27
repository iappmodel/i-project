import { useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { readSavedLoopItems, removeLoopItem } from '../lib/savedLoop'
import { useDemo } from '../state/useDemo'

export function SavedScreen() {
  const { setScreen } = useDemo()
  const [items, setItems] = useState(() => readSavedLoopItems())

  const empty = useMemo(() => items.length === 0, [items.length])

  return (
    <PhoneFrame scroll>
      <BackRow label="Feed" onBack={() => setScreen('feed')} />
      <h1 className="screen-title">Saved</h1>
      <p className="screen-sub">Loop 2 scaffold · Browse → Save → Return</p>

      {empty ? (
        <p className="mono-muted" style={{ marginTop: 16 }}>
          No saved items yet. Save one from Feed.
        </p>
      ) : (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <article key={item.id} className="eco-card neu-surface">
              <header className="eco-hdr">
                <span>{item.source}</span>
                <strong className="mono">{new Date(item.savedAt).toLocaleDateString()}</strong>
              </header>
              <p className="eco-body">{item.title}</p>
              <button
                type="button"
                className="sec-link-wu"
                onClick={() => setItems(removeLoopItem(item.id))}
                style={{ marginTop: 6 }}
              >
                Remove
              </button>
            </article>
          ))}
        </div>
      )}

      <Button style={{ marginTop: 16 }} onClick={() => setScreen('feed')}>
        Back to feed
      </Button>
      <SourceEvidence
        paths={[
          '06_feed_earning_loops/iapp_feed_screen.html',
          'MASTER_BRAIN/ORGANISM_STATUS.md',
        ]}
      />
    </PhoneFrame>
  )
}
