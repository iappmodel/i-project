import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ImmersiveBottomNav,
  immersiveTabFromProduct,
} from '../components/ImmersiveBottomNav'
import { ImmersiveRewardBadge } from '../components/immersive/ImmersiveRewardBadge'
import { OutProfileChip } from '../components/immersive/OutProfileChip'
import { MediaActionRail } from '../components/gestureButtons/MediaActionRail'
import { EloPresenceLayer } from '../components/elo/EloPresenceLayer'
import { OfferReviewSheet } from '../components/gestureButtons/OfferReviewSheet'
import { PhoneFrame } from '../components/PhoneFrame'
import { ImmersiveWalletSheet } from '../components/immersive/ImmersiveWalletSheet'
import { ImmersiveProfileSheet } from '../components/immersive/ImmersiveProfileSheet'
import { feedItemToMedia } from '../data/immersiveFeedContext'
import { formatCoinLabel } from '../lib/gestureButtons/offerService'
import { resolveOutProfileCreator, outProfileTapAction } from '../lib/outProfileEngine'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { useFeedInteraction } from '../hooks/useFeedInteraction'
import { useImmersiveFeed } from '../hooks/useImmersiveFeed'
import { useOfferSession } from '../hooks/useOfferSession'
import { useDemo } from '../state/useDemo'

const SUNSET_BG = '/media/immersive-sunset.svg'

export function ImmersiveFeedScreen() {
  const {
    setScreen,
    setActiveTab,
    activeTab,
    iCoins,
    iCoinsPending,
    aCoins,
    walletBackend,
    beginImmersiveWatch,
  } = useDemo()

  const feed = useImmersiveFeed(true)
  const media = useMemo(() => feedItemToMedia(feed.current), [feed.current])

  const [toast, setToast] = useState<string | null>(null)
  const [walletSheetOpen, setWalletSheetOpen] = useState(false)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [timerPct] = useState(38)
  const [bgSrc, setBgSrc] = useState(SUNSET_BG)
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null)

  const outCreator = resolveOutProfileCreator({
    id: media.creatorId,
    displayName: media.creatorName,
    location: media.creatorLocation,
    avatarInitials: media.creatorAvatarInitials,
    sponsoredOfferId: media.contentId,
  })

  const sponsoredOffer = useMemo(
    () => ({
      id: media.contentId,
      brand: media.creatorName,
      title: feed.current.title,
      description: 'Immersive feed → watch & verify',
      platform: 'In-app · Feed',
      rewardICoins: feed.current.reward,
      sponsorLabel: feed.current.coinType === 'icoin' ? 'Reward' : 'Promo',
      platformCode: 'IM',
      watchDuration: `0:${String(feed.current.duration % 60).padStart(2, '0')}`,
      thumbnailGradient: 'linear-gradient(160deg,#1a1030,#0a1520,#2d1b4e)',
      creatorHandle: media.creatorName,
    }),
    [feed.current, media],
  )

  const trackEnabled = walletBackend === 'live'

  const { liked, likeCount, toggleLike, trackShare, trackViewStart, trackSkip } =
    useFeedInteraction({
      contentId: media.contentId,
      category: feed.current.category,
      tags: feed.current.tags,
      initialLikeCount: media.initialLikeCount,
      trackEnabled,
    })

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

  const handleWatchSponsored = useCallback(() => {
    beginImmersiveWatch(sponsoredOffer)
  }, [beginImmersiveWatch, sponsoredOffer])

  const handleOutProfileTap = useCallback(() => {
    const action = outProfileTapAction(outCreator)
    if (action.type === 'open_offer') {
      beginImmersiveWatch(sponsoredOffer)
      return
    }
    flash('Creator feed (coming soon)')
  }, [beginImmersiveWatch, flash, outCreator, sponsoredOffer])

  const handleLikeToggle = useCallback(
    (next: boolean) => {
      if (next !== liked) void toggleLike()
    },
    [liked, toggleLike],
  )

  useEffect(() => {
    const thumb = feed.current.thumbnail || feed.current.videoSrc
    if (!thumb) {
      setBgSrc(SUNSET_BG)
      return
    }
    const img = new Image()
    img.onload = () => setBgSrc(thumb)
    img.onerror = () => setBgSrc(SUNSET_BG)
    img.src = thumb
  }, [feed.current.id, feed.current.thumbnail, feed.current.videoSrc])

  useEffect(() => {
    void trackViewStart()
  }, [feed.current.id, trackViewStart])

  useEffect(() => {
    if (feed.index >= feed.items.length - 2) {
      void feed.appendMore()
    }
  }, [feed.index, feed.items.length, feed.appendMore])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ command?: string }>).detail
      if (detail?.command === 'like') void toggleLike()
      if (detail?.command === 'comment') flash('Comments (vision)')
      if (detail?.command === 'share') {
        void trackShare()
        flash('Shared')
      }
    }
    window.addEventListener('screenTargetAction', handler)
    return () => window.removeEventListener('screenTargetAction', handler)
  }, [toggleLike, trackShare, flash])

  const onSwipePointerDown = useCallback((e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
  }, [])

  const onSwipePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = swipeRef.current
      swipeRef.current = null
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      const dt = Date.now() - start.t
      if (adx < 28 && ady < 28 && dt < 400) {
        handleWatchSponsored()
        return
      }
      if (ady > adx) {
        if (dy < 0) {
          void trackSkip()
          feed.next()
        } else {
          void trackSkip()
          feed.prev()
        }
      } else if (adx > 28) {
        if (dx < 0) feed.next()
        else feed.prev()
      }
    },
    [feed, handleWatchSponsored, trackSkip],
  )

  const rewardBalance = Math.max(50, Math.floor(iCoins + iCoinsPending))

  const handleRewardEdit = useCallback(() => {
    if (offerSession.offer?.status === 'review') {
      offerSession.setSheetOpen(true)
    }
  }, [offerSession])

  const balanceLimits = useMemo(
    () => ({
      icoin: Math.max(0, Math.floor(iCoins)),
      vicoin: Math.max(0, Math.floor(aCoins)),
    }),
    [iCoins, aCoins],
  )

  return (
    <PhoneFrame>
      <div className="phone-screen phone-screen--immersive">
        <div className="immersive-feed" style={{ overscrollBehavior: 'none' }}>
          <div
            className="immersive-feed__media"
            style={{ backgroundImage: `url(${bgSrc})` }}
            aria-hidden
          />
          <div
            className="immersive-feed__swipe"
            onPointerDown={onSwipePointerDown}
            onPointerUp={onSwipePointerUp}
            onPointerCancel={() => { swipeRef.current = null }}
            aria-label="Swipe for next clip; tap to watch"
          />
          <div className="immersive-feed__lane-dots" aria-hidden>
            {feed.items.slice(0, 8).map((item, i) => (
              <i key={item.id} className={i === feed.index % 8 ? 'on' : ''} />
            ))}
          </div>
          <div className="immersive-feed__scrim-top" />
          <div className="immersive-feed__scrim-bottom" />

          <EloPresenceLayer />

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
            onPress={handleOutProfileTap}
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
          {feed.loading ? (
            <div className="immersive-toast" style={{ top: '4.5rem' }}>
              Loading feed…
            </div>
          ) : null}

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
            onCreate={() => flash('Create · Studio (coming soon)')}
            onWallet={() => setWalletSheetOpen(true)}
            onProfile={() => setProfileSheetOpen(true)}
          />

          <ImmersiveWalletSheet
            open={walletSheetOpen}
            onClose={() => setWalletSheetOpen(false)}
            onConvert={() => {
              setWalletSheetOpen(false)
              setActiveTab('wallet')
              setScreen('convert')
            }}
            onWithdraw={() => {
              setWalletSheetOpen(false)
              setActiveTab('wallet')
              setScreen('withdraw-preview')
            }}
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

          <div className="immersive-home-indicator" aria-hidden />
        </div>
      </div>
    </PhoneFrame>
  )
}
