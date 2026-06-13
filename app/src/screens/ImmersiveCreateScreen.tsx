import { useCallback, useRef, useState } from 'react'
import { ImmersiveBottomNav, immersiveTabFromProduct } from '../components/ImmersiveBottomNav'
import { PhoneFrame } from '../components/PhoneFrame'
import { Button } from '../components/Button'
import { useDemo } from '../state/useDemo'

export function ImmersiveCreateScreen() {
  const { setScreen, setActiveTab, activeTab } = useDemo()
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = useCallback((file: File | null) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }, [])

  return (
    <PhoneFrame>
      <div className="phone-screen phone-screen--immersive">
        <div className="immersive-create">
          <header className="immersive-create__header">
            <h1 className="immersive-create__title">Create</h1>
            <p className="immersive-create__sub">Upload · trim · publish (demo)</p>
          </header>
          <input
            ref={inputRef}
            type="file"
            accept="video/*,image/*"
            className="immersive-create__file"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            Choose media
          </Button>
          {preview ? (
            <div className="immersive-create__preview">
              {preview.includes('video') ? (
                <video src={preview} controls className="immersive-create__media" />
              ) : (
                <img src={preview} alt="" className="immersive-create__media" />
              )}
            </div>
          ) : (
            <div className="immersive-create__placeholder">Local preview only — no cloud upload in demo</div>
          )}
          <Button
            variant="secondary"
            disabled={!preview}
            onClick={() => {
              setActiveTab('profile')
              setScreen('immersive-studio')
            }}
          >
            Open studio
          </Button>
          <ImmersiveBottomNav
            active={immersiveTabFromProduct(activeTab)}
            onFeed={() => {
              setActiveTab('feed')
              setScreen('immersive-feed')
            }}
            onPromo={() => {
              setActiveTab('earn')
              setScreen('immersive-promo')
            }}
            onCreate={() => setScreen('immersive-create')}
            onWallet={() => setScreen('wallet')}
            onProfile={() => setScreen('profile')}
          />
        </div>
      </div>
    </PhoneFrame>
  )
}
