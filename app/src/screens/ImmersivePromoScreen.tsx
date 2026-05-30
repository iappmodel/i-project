import { useCallback, useState } from 'react'
import {
  ImmersiveBottomNav,
  immersiveTabFromProduct,
} from '../components/ImmersiveBottomNav'
import { PhoneFrame } from '../components/PhoneFrame'
import { ImmersiveWalletSheet } from '../components/immersive/ImmersiveWalletSheet'
import { ImmersiveProfileSheet } from '../components/immersive/ImmersiveProfileSheet'
import {
  PROMO_MARKETPLACE_OFFERS,
  promoKindLabel,
  type PromoOffer,
} from '../data/promoOffers'
import { formatCoinLabel } from '../lib/gestureButtons/offerService'
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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
            <p className="immersive-promo__sub">Pick a campaign · watch · verify · earn</p>
          </header>

          <div className="immersive-promo__list">
            {PROMO_MARKETPLACE_OFFERS.map((offer) => (
              <PromoOfferCard
                key={offer.id}
                offer={offer}
                onSelect={handleSelect}
              />
            ))}
          </div>

          <div className="immersive-promo__map-chip" aria-hidden>
            Map view · local promos (coming soon)
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
