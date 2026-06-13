import { useCallback, useEffect, useState } from 'react'
import {
  ImmersiveBottomNav,
  immersiveTabFromProduct,
} from '../components/ImmersiveBottomNav'
import { PhoneFrame } from '../components/PhoneFrame'
import { ImmersiveWalletSheet } from '../components/immersive/ImmersiveWalletSheet'
import { ImmersiveProfileSheet } from '../components/immersive/ImmersiveProfileSheet'
import { ImmersiveTaskCenterSheet } from '../components/immersive/ImmersiveTaskCenterSheet'
import {
  PROMO_MARKETPLACE_OFFERS,
  promoKindLabel,
  type PromoOffer,
} from '../data/promoOffers'
import { formatCoinLabel } from '../lib/gestureButtons/offerService'
import { fetchNearbyPromotions, mapNearbyToPromoOffer } from '../services/promo.service'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { useDemo } from '../state/useDemo'

function PromoOfferCard({
  offer,
  onSelect,
}: {
  offer: PromoOffer
  onSelect: (offer: PromoOffer) => void
}) {
  return (
    <button
      type="button"
      className="immersive-promo-card"
      onClick={() => onSelect(offer)}
      style={{ background: offer.thumbnailGradient }}
    >
      <div className="immersive-promo-card__scrim" />
      <div className="immersive-promo-card__body">
        <p className="immersive-promo-card__brand">{offer.brand}</p>
        <p className="immersive-promo-card__title">{offer.title}</p>
        <p className="immersive-promo-card__desc">{offer.description}</p>
        <div className="immersive-promo-card__meta">
          <span className="immersive-promo-card__reward mono">
            +{formatCoinLabel('icoin', offer.rewardICoins)}
          </span>
          <span className="immersive-promo-card__type">{promoKindLabel(offer.kind)}</span>
          {offer.distanceLabel ? (
            <span className="immersive-promo-card__distance mono">{offer.distanceLabel}</span>
          ) : null}
        </div>
      </div>
    </button>
  )
}

export function ImmersivePromoScreen() {
  const { setScreen, setActiveTab, activeTab, beginImmersiveWatch } = useDemo()
  const [walletSheetOpen, setWalletSheetOpen] = useState(false)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [offers, setOffers] = useState(PROMO_MARKETPLACE_OFFERS)
  const [liveNearby, setLiveNearby] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const rows = await fetchNearbyPromotions()
      if (cancelled || rows.length === 0) return
      const mapped = rows.map(mapNearbyToPromoOffer)
      setOffers((prev) => {
        const seen = new Set(prev.map((o) => o.id))
        const fresh = mapped.filter((o) => !seen.has(o.id))
        return fresh.length ? [...fresh, ...prev] : prev
      })
      setLiveNearby(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const handleSelect = useCallback(
    (offer: PromoOffer) => {
      setSelectedId(offer.id)
      beginImmersiveWatch(offer)
    },
    [beginImmersiveWatch],
  )

  return (
    <PhoneFrame>
      <div className="phone-screen phone-screen--immersive">
        <div className="immersive-promo">
          <header className="immersive-promo__header">
            <p className="immersive-promo__label">Promo</p>
            <h1 className="immersive-promo__title">Sponsor briefs</h1>
            <p className="immersive-promo__sub">
              Pick a campaign · watch · verify · earn
              {liveNearby ? ' · live nearby' : ''}
            </p>
          </header>

          <div className="immersive-promo__list">
            {offers.map((offer) => (
              <PromoOfferCard
                key={offer.id}
                offer={offer}
                onSelect={handleSelect}
              />
            ))}
          </div>

          <div className="immersive-promo__map-chip" aria-hidden>
            {liveNearby ? 'Nearby promos loaded' : 'Map view · local promos (demo)'}
          </div>

          <ImmersiveBottomNav
            active={immersiveTabFromProduct(activeTab)}
            onFeed={() => {
              setActiveTab('feed')
              setScreen('immersive-feed')
            }}
            onPromo={() => setScreen('immersive-promo')}
            onCreate={() => flash('Create · Studio (coming soon)')}
            onWallet={() => setWalletSheetOpen(true)}
            onProfile={() => setProfileSheetOpen(true)}
          />

          <ImmersiveWalletSheet
            open={walletSheetOpen}
            onClose={() => setWalletSheetOpen(false)}
            onOpenFull={() => {
              setWalletSheetOpen(false)
              setActiveTab('wallet')
              setScreen('wallet')
            }}
          />
          <ImmersiveProfileSheet
            open={profileSheetOpen}
            onClose={() => setProfileSheetOpen(false)}
            onOpenTasks={() => {
              setProfileSheetOpen(false)
              setTaskSheetOpen(true)
            }}
            onOpenFull={() => {
              setProfileSheetOpen(false)
              setActiveTab('profile')
              setScreen('profile')
            }}
            onOpenVision={
              isWebVisionEnabled()
                ? () => {
                    setProfileSheetOpen(false)
                    setActiveTab('profile')
                    setScreen('profile')
                  }
                : undefined
            }
          />
          <ImmersiveTaskCenterSheet
            open={taskSheetOpen}
            onClose={() => setTaskSheetOpen(false)}
            onToast={flash}
          />

          {toast ? <div className="immersive-toast">{toast}</div> : null}

          {selectedId ? (
            <p className="immersive-promo__toast mono" aria-live="polite">
              Opening brief…
            </p>
          ) : null}

          <div className="immersive-home-indicator" aria-hidden />
        </div>
      </div>
    </PhoneFrame>
  )
}
