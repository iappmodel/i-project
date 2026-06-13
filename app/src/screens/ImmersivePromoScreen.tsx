import { useCallback, useEffect, useState } from 'react'
import {
  ImmersiveBottomNav,
  immersiveTabFromProduct,
} from '../components/ImmersiveBottomNav'
import { PhoneFrame } from '../components/PhoneFrame'
import { ImmersiveGlassSheet } from '../components/immersive/ImmersiveGlassSheet'
import { ImmersiveWalletSheet } from '../components/immersive/ImmersiveWalletSheet'
import { ImmersiveProfileSheet } from '../components/immersive/ImmersiveProfileSheet'
import { ImmersiveTaskCenterSheet } from '../components/immersive/ImmersiveTaskCenterSheet'
import { ImmersivePromoReviewSheet } from '../components/immersive/ImmersivePromoReviewSheet'
import { QuickCheckInSheet } from '../components/immersive/QuickCheckInSheet'
import { ImmersivePromoMapSheetBody } from '../components/immersive/ImmersivePromoMapSheet'
import { ImmersiveRouteBuilderSheet } from '../components/immersive/ImmersiveRouteBuilderSheet'
import {
  PROMO_MARKETPLACE_OFFERS,
  promoKindLabel,
  type PromoOffer,
} from '../data/promoOffers'
import { formatCoinLabel } from '../lib/gestureButtons/offerService'
import { fetchNearbyPromotions, mapNearbyToPromoOffer } from '../services/promo.service'
import { fetchMapboxToken } from '../services/mapbox.service'
import { consumePendingPromoReview } from '../lib/pendingPromoReview'
import { useCheckInStatus } from '../hooks/useCheckInStatus'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { useDemo } from '../state/useDemo'

function PromoOfferCard({
  offer,
  onSelect,
  onCheckIn,
}: {
  offer: PromoOffer
  onSelect: (offer: PromoOffer) => void
  onCheckIn: (offer: PromoOffer) => void
}) {
  return (
    <div className="immersive-promo-card-wrap">
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
      <button type="button" className="immersive-promo-card__checkin" onClick={() => onCheckIn(offer)}>
        Check in
      </button>
    </div>
  )
}

export function ImmersivePromoScreen() {
  const { setScreen, setActiveTab, activeTab, beginImmersiveWatch } = useDemo()
  const checkIn = useCheckInStatus()
  const [walletSheetOpen, setWalletSheetOpen] = useState(false)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [taskSheetOpen, setTaskSheetOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [routeOpen, setRouteOpen] = useState(false)
  const [reviewPromoId, setReviewPromoId] = useState<string | null>(null)
  const [checkInOffer, setCheckInOffer] = useState<PromoOffer | null>(null)
  const [hasMapToken, setHasMapToken] = useState(false)
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
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    void fetchMapboxToken().then((t) => setHasMapToken(Boolean(t)))
  }, [])

  useEffect(() => {
    const pending = consumePendingPromoReview()
    if (pending) {
      setReviewPromoId(pending)
      setReviewOpen(true)
    }
  }, [])

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const handleSelect = useCallback(
    (offer: PromoOffer) => {
      beginImmersiveWatch(offer)
    },
    [beginImmersiveWatch],
  )

  const reviewTitle = offers.find((o) => o.id === reviewPromoId)?.title

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
                onCheckIn={(o) => {
                  setCheckInOffer(o)
                  setCheckInOpen(true)
                }}
              />
            ))}
          </div>

          <button type="button" className="immersive-promo__map-chip" onClick={() => setMapOpen(true)}>
            {liveNearby ? 'Nearby promos · open map' : 'Map view · demo list'}
          </button>
          <button type="button" className="immersive-promo__route-link" onClick={() => setRouteOpen(true)}>
            Build promo route
          </button>

          <ImmersiveBottomNav
            active={immersiveTabFromProduct(activeTab)}
            onFeed={() => {
              setActiveTab('feed')
              setScreen('immersive-feed')
            }}
            onPromo={() => setScreen('immersive-promo')}
            onCreate={() => setScreen('immersive-create')}
            onWallet={() => setWalletSheetOpen(true)}
            onProfile={() => setProfileSheetOpen(true)}
          />

          <ImmersiveWalletSheet open={walletSheetOpen} onClose={() => setWalletSheetOpen(false)} onPay={() => { setWalletSheetOpen(false); flash('Pay sheet on feed wallet') }} onOpenFull={() => { setWalletSheetOpen(false); setActiveTab('wallet'); setScreen('wallet') }} />
          <ImmersiveProfileSheet open={profileSheetOpen} onClose={() => setProfileSheetOpen(false)} streakDays={checkIn.streakDays} onOpenTasks={() => { setProfileSheetOpen(false); setTaskSheetOpen(true) }} onOpenFull={() => { setProfileSheetOpen(false); setActiveTab('profile'); setScreen('profile') }} onOpenVision={isWebVisionEnabled() ? () => { setProfileSheetOpen(false); setScreen('profile') } : undefined} />
          <ImmersiveTaskCenterSheet open={taskSheetOpen} onClose={() => setTaskSheetOpen(false)} onToast={flash} />
          <ImmersivePromoReviewSheet open={reviewOpen} promotionId={reviewPromoId} promotionTitle={reviewTitle} onClose={() => setReviewOpen(false)} onToast={flash} />
          <QuickCheckInSheet open={checkInOpen} promotionId={checkInOffer?.id} promotionTitle={checkInOffer?.title} onClose={() => setCheckInOpen(false)} onToast={flash} />
          <ImmersiveRouteBuilderSheet open={routeOpen} onClose={() => setRouteOpen(false)} onToast={flash} />
          <ImmersiveGlassSheet open={mapOpen} title="Nearby map" onClose={() => setMapOpen(false)}>
            <ImmersivePromoMapSheetBody offers={offers} hasMapToken={hasMapToken} />
          </ImmersiveGlassSheet>

          {toast ? <div className="immersive-toast">{toast}</div> : null}
          <div className="immersive-home-indicator" aria-hidden />
        </div>
      </div>
    </PhoneFrame>
  )
}
