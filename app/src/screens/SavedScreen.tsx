import { useEffect } from 'react'
import { BackRow } from '../components/BackRow'
import { PhoneFrame } from '../components/PhoneFrame'
import { useSavedContent } from '../hooks/useSavedContent'
import { useDemo } from '../state/useDemo'

export function SavedScreen() {
  const { setScreen } = useDemo()
  const { items, loading, remove, isDemo, reload } = useSavedContent()

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <PhoneFrame scroll>
      <BackRow label="Feed" onBack={() => setScreen('immersive-feed')} />
      <h1 className="screen-title">Saved</h1>
      <p className="screen-sub">
        Loop 2 · {isDemo ? 'local demo vault' : 'synced to your account'}
      </p>

      {loading ? <p className="immersive-glass-sheet__hint mono">Loading…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="immersive-glass-sheet__hint" style={{ marginTop: 16 }}>
          No saved items yet. Tap Save on the immersive feed.
        </p>
      ) : null}

      <ul className="saved-sheet__list">
        {items.map((item) => (
          <li key={item.id} className="saved-sheet__card">
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" className="saved-sheet__thumb" />
            ) : (
              <div className="saved-sheet__thumb saved-sheet__thumb--placeholder" />
            )}
            <div className="saved-sheet__body">
              <p className="saved-sheet__title">{item.title}</p>
              <p className="saved-sheet__meta mono">
                {item.source} · {new Date(item.savedAt).toLocaleDateString()}
              </p>
              <button type="button" className="saved-sheet__remove" onClick={() => void remove(item.id)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </PhoneFrame>
  )
}
