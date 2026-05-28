import { useMemo } from 'react'
import { useGestureButton, type UseGestureButtonCallbacks } from '../../hooks/useGestureButton'
import type { ButtonInstanceConfig, WalletBalanceLimits } from '../../lib/gestureButtons/types'
import { HeartWaterfall } from './HeartWaterfall'

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg className="gesture-button__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 21s-6-4.35-9-8.5C1.5 9.5 3.5 5 7.5 5c2 0 3.5 1.5 4.5 3 1-1.5 2.5-3 4.5-3 4 0 6 4.5 3.5 7.5C18 16.65 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg className="gesture-button__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.2 0-2.3-.25-3.35-.7L5 21l1.7-4.15A8.47 8.47 0 013 11.5 8.5 8.5 0 0111.5 3 8.5 8.5 0 0121 11.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className="gesture-button__icon" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg className="gesture-button__icon" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="gesture-button__icon" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

type Props = {
  config: ButtonInstanceConfig
  callbacks?: UseGestureButtonCallbacks
  onOpenSettings?: () => void
  showCrossMode?: boolean
  showLikeCount?: boolean
  liked?: boolean
  likeCount?: number
  onLikeToggle?: (liked: boolean) => void
  balanceLimits?: WalletBalanceLimits
}

export function GestureButton({
  config,
  callbacks,
  onOpenSettings,
  showCrossMode = true,
  showLikeCount = true,
  liked,
  likeCount,
  onLikeToggle,
  balanceLimits,
}: Props) {
  const gesture = useGestureButton(config, {
    callbacks,
    enableOfferMode: config.id === 'like-love',
    balanceLimits,
    liked,
    likeCount,
    onLikeToggle,
  })

  const sizeClass =
    config.chrome.size === 'sm'
      ? 'gesture-button--sm'
      : config.chrome.size === 'lg'
        ? 'gesture-button--lg'
        : ''

  const icon = useMemo(() => {
    switch (config.chrome.icon) {
      case 'heart':
        return <HeartIcon filled={gesture.liked} />
      case 'comment':
        return <CommentIcon />
      case 'share':
        return <ShareIcon />
      case 'plus':
        return <PlusIcon />
      default:
        return <MoreIcon />
    }
  }, [config.chrome.icon, gesture.liked])

  const pointerHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      gesture.onPointerDown(e.clientX, e.clientY)
    },
    onPointerMove: (e: React.PointerEvent) => {
      gesture.onPointerMove(e.clientX, e.clientY)
    },
    onPointerUp: (e: React.PointerEvent) => {
      gesture.onPointerUp()
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* released */
      }
    },
    onPointerCancel: () => gesture.onPointerCancel(),
  }

  const isLikeLove = config.id === 'like-love'
  const offering = gesture.phase === 'offering' || gesture.phase === 'armed'

  if (!config.enabled) return null

  return (
    <div className="gesture-button-wrap">
      {showCrossMode && isLikeLove && gesture.showCross ? (
        <div className="gesture-button-cross gesture-button-cross--visible" aria-hidden>
          <div
            className={`gesture-cross-arm gesture-cross-arm--up ${gesture.activeDirection === 'up' ? 'gesture-cross-arm--active' : ''}`}
          />
          <div
            className={`gesture-cross-arm gesture-cross-arm--down ${gesture.activeDirection === 'down' ? 'gesture-cross-arm--active' : ''}`}
          />
          <div
            className={`gesture-cross-arm gesture-cross-arm--left ${gesture.activeDirection === 'left' ? 'gesture-cross-arm--active' : ''}`}
          />
          <div
            className={`gesture-cross-arm gesture-cross-arm--right ${gesture.activeDirection === 'right' ? 'gesture-cross-arm--active' : ''}`}
          />
        </div>
      ) : null}

      {isLikeLove && gesture.waterfallActive ? (
        <HeartWaterfall active direction={gesture.activeDirection === 'down' ? 'down' : 'up'} />
      ) : null}

      {showLikeCount && config.chrome.icon === 'heart' ? (
        <span
          className={`gesture-button__label ${offering && gesture.offerAmount > 0 ? 'gesture-button__label--offer' : ''}`}
        >
          {gesture.displayLabel}
        </span>
      ) : null}

      <button
        type="button"
        className={[
          'gesture-button',
          sizeClass,
          gesture.liked && config.chrome.icon === 'heart' ? 'gesture-button--liked' : '',
          gesture.showCross ? 'gesture-button--armed' : '',
          gesture.isDeepHold ? 'gesture-button--deep' : '',
          config.chrome.icon !== 'heart' ? 'gesture-button--icon-only' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={config.label}
        style={{ opacity: config.chrome.glassOpacity + 0.55 }}
        onContextMenu={(e) => {
          e.preventDefault()
          onOpenSettings?.()
        }}
        {...pointerHandlers}
      >
        <span className="gesture-button__ring" />
        {gesture.isDeepHold ? <span className="gesture-button__ring-outer" /> : null}
        {icon}
      </button>
    </div>
  )
}
