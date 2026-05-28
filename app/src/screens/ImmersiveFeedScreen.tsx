import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ImmersiveBottomNav,
  immersiveTabFromProduct,
} from '../components/ImmersiveBottomNav'
import { ImmersiveRewardBadge } from '../components/immersive/ImmersiveRewardBadge'
import { OutProfileChip } from '../components/immersive/OutProfileChip'
import { MediaActionRail } from '../components/gestureButtons/MediaActionRail'
import { OfferReviewSheet } from '../components/gestureButtons/OfferReviewSheet'
import { PhoneFrame } from '../components/PhoneFrame'
import { DEMO_IMMERSIVE_MEDIA } from '../data/immersiveFeedContext'
import { formatCoinLabel } from '../lib/gestureButtons/offerService'
import { useContentLike } from '../hooks/useContentLike'
import { useOfferSession } from '../hooks/useOfferSession'
import { useDemo } from '../state/useDemo'

const SUNSET_BG = '/media/immersive-sunset.svg'
const SUNSET_PHOTO =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80'

export function ImmersiveFeedScreen() {
  const {
    setScreen,
    setActiveTab,
    activeTab,
    iCoins,
    iCoinsPending,
    aCoins,
    walletBackend,
    selectOffer,
  } = useDemo()
  const [toast, setToast] = useState<string | null>(null)
  const [timerPct] = useState(38)
  const [bgSrc, setBgSrc] = useState(SUNSET_PHOTO)

  const media = DEMO_IMMERSIVE_MEDIA

  const { liked, likeCount, toggleLike } = useContentLike({
    contentId: media.contentId,
    initialCount: media.initialLikeCount,
    enabled: walletBackend === 'live',
  })

  const balanceLimits = useMemo(
    () => ({
      icoin: Math.max(0, Math.floor(iCoins)),
      vicoin: Math.max(0, Math.floor(aCoins)),
    }),
    [iCoins, aCoins],
  )

  const flash = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const offerSession = useOfferSession({
    contentId: media.contentId,
    creatorId: media.creatorId,
    walletBackend,
    onSettled: (o) => flash(`Offer sent · ${formatCoinLabel(o.coin, o.amount)}`),
    onError: (msg) => flash(msg),
  })

  const handleLikeToggle = useCallback(
    (next: boolean) => {
      if (next !== liked) void toggleLike()
    },
    [liked, toggleLike],
  )

  useEffect(() => {
    const img = new Image()
    img.onload = () => setBgSrc(SUNSET_PHOTO)
    img.onerror = () => setBgSrc(SUNSET_BG)
    img.src = SUNSET_PHOTO
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ command?: string }>).detail
      if (detail?.command === 'like') void toggleLike()
      if (detail?.command === 'comment') flash('Comments (vision)')
      if (detail?.command === 'share') flash('Share (vision)')
    }
    window.addEventListener('screenTargetAction', handler)
    return () => window.removeEventListener('screenTargetAction', handler)
  }, [toggleLike, flash])

  const rewardBalance = Math.max(50, Math.floor(iCoins + iCoinsPending))

  const handleRewardEdit = useCallback(() => {
    if (offerSession.offer?.status === 'review') {
      offerSession.setSheetOpen(true)
    }
  }, [offerSession])

  const handleWatchSponsored = useCallback(() => {
    selectOffer({
      id: media.contentId,
      brand: media.creatorName,
      title: 'Sunset · sponsored watch',
      description: 'Immersive feed → watch & verify',
      platform: 'In-app · Sponsored',
      rewardICoins: 12,
      sponsorLabel: 'Sponsored',
      platformCode: 'IM',
      watchDuration: '0:45',
      thumbnailGradient: 'linear-gradient(160deg,#1a1030,#0a1520,#2d1b4e)',
      creatorHandle: media.creatorName,
    })
    setScreen('watch-verify')
  }, [selectOffer, media, setScreen])

  return (
    <PhoneFrame>
      <div className="phone-screen phone-screen--immersive">
        <div className="immersive-feed" style={{ overscrollBehavior: 'none' }}>
          <div
            className="immersive-feed__media"
            style={{ backgroundImage: `url(${bgSrc})` }}
            aria-hidden
          />
          <div className="immersive-feed__scrim-top" />
          <div className="immersive-feed__scrim-bottom" />

          <div className="immersive-feed__timer" aria-label="Media progress">
            <div className="immersive-feed__timer-fill" style={{ width: `${timerPct}%` }} />
          </div>

          <ImmersiveRewardBadge
            balanceIc={rewardBalance}
            offer={offerSession.offer}
            onEdit={handleRewardEdit}
            onCancel={offerSession.cancel}
            onConfirm={() => {
              if (offerSession.offer?.status === 'review') {
                offerSession.setSheetOpen(true)
              } else {
                void offerSession.confirm()
              }
            }}
          />

          <OutProfileChip
            name={media.creatorName}
            location={media.creatorLocation}
            avatarInitials={media.creatorAvatarInitials}
          />

          <button
            type="button"
            className="immersive-feed__watch-cta"
            onClick={handleWatchSponsored}
          >
            Watch & earn
          </button>

          <MediaActionRail
            onOfferReview={offerSession.openReview}
            onActionMessage={flash}
            liked={liked}
            likeCount={likeCount}
            onLikeToggle={handleLikeToggle}
            balanceLimits={balanceLimits}
          />

          <OfferReviewSheet
            offer={offerSession.offer}
            open={offerSession.sheetOpen}
            maxAmount={99}
            onClose={offerSession.cancel}
            onAmountChange={offerSession.updateAmount}
            onConfirm={() => void offerSession.confirm()}
          />

          {toast ? <div className="immersive-toast">{toast}</div> : null}

          <ImmersiveBottomNav
            active={immersiveTabFromProduct(activeTab)}
            onFeed={() => {
              setActiveTab('feed')
              setScreen('immersive-feed')
            }}
            onPromo={() => setActiveTab('earn')}
            onCreate={() => flash('Create · Studio (coming soon)')}
            onWallet={() => {
              setActiveTab('wallet')
              setScreen('wallet')
            }}
            onProfile={() => {
              setActiveTab('profile')
              setScreen('profile')
            }}
          />

          <div className="immersive-home-indicator" aria-hidden />
        </div>
      </div>
    </PhoneFrame>
  )
}
