import { useCallback, useEffect, useRef, useState } from 'react'
import { newOfferId } from '../lib/gestureButtons/offerService'
import { rampAmount, rampStepIndex } from '../lib/gestureButtons/ramp'
import {
  bindingFor,
  clampTipAmount,
  coinFromDirection,
} from '../lib/gestureButtons/types'
import type {
  ButtonAction,
  ButtonInstanceConfig,
  GesturePhase,
  OfferSession,
  SwipeDirection,
  WalletBalanceLimits,
} from '../lib/gestureButtons/types'
import { useHapticFeedback } from './useHapticFeedback'

function resolveDirection(dx: number, dy: number, threshold: number): SwipeDirection | null {
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy < 0 ? 'up' : 'down'
  }
  return dx < 0 ? 'left' : 'right'
}

export interface UseGestureButtonCallbacks {
  onLike?: () => void
  onUnlike?: () => void
  onAction?: (action: ButtonAction) => void
  onOfferReview?: (offer: OfferSession) => void
  onBuilderHold?: () => void
}

export interface UseGestureButtonOptions {
  callbacks?: UseGestureButtonCallbacks
  /** Like/Love only — other buttons use tap/multi-tap only */
  enableOfferMode?: boolean
  balanceLimits?: WalletBalanceLimits
  liked?: boolean
  likeCount?: number
  onLikeToggle?: (liked: boolean) => void
}

const DEFAULT_LIMITS: WalletBalanceLimits = { vicoin: 999, icoin: 999 }

export function useGestureButton(
  config: ButtonInstanceConfig,
  options: UseGestureButtonOptions = {},
) {
  const {
    callbacks = {},
    enableOfferMode = config.id === 'like-love',
    balanceLimits = DEFAULT_LIMITS,
    liked: likedProp,
    likeCount: likeCountProp,
    onLikeToggle,
  } = options

  const haptic = useHapticFeedback()
  const [phase, setPhase] = useState<GesturePhase>('idle')
  const [likedInternal, setLikedInternal] = useState(false)
  const [likeCountInternal, setLikeCountInternal] = useState(2842)
  const [offerAmount, setOfferAmount] = useState(0)
  const [activeDirection, setActiveDirection] = useState<SwipeDirection | null>(null)
  const [isDeepHold, setIsDeepHold] = useState(false)
  const [showCross, setShowCross] = useState(false)
  const [waterfallActive, setWaterfallActive] = useState(false)

  const liked = likedProp ?? likedInternal
  const likeCount = likeCountProp ?? likeCountInternal

  const phaseRef = useRef(phase)
  const pointerStart = useRef({ x: 0, y: 0, t: 0 })
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const builderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rampTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const offeringStarted = useRef(0)
  const isDeepHoldRef = useRef(false)
  const activeDirectionRef = useRef<SwipeDirection | null>(null)
  const tapTimes = useRef<number[]>([])
  const tapResolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didArmedRef = useRef(false)
  const balanceLimitsRef = useRef(balanceLimits)
  const configRef = useRef(config)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    balanceLimitsRef.current = balanceLimits
  }, [balanceLimits])
  useEffect(() => {
    configRef.current = config
  }, [config])
  useEffect(() => {
    isDeepHoldRef.current = isDeepHold
  }, [isDeepHold])
  useEffect(() => {
    activeDirectionRef.current = activeDirection
  }, [activeDirection])

  const clearTimers = useCallback(() => {
    if (armTimer.current) clearTimeout(armTimer.current)
    if (builderTimer.current) clearTimeout(builderTimer.current)
    if (deepTimer.current) clearTimeout(deepTimer.current)
    if (rampTimer.current) clearInterval(rampTimer.current)
    armTimer.current = null
    builderTimer.current = null
    deepTimer.current = null
    rampTimer.current = null
  }, [])

  const stopOffering = useCallback(() => {
    if (rampTimer.current) {
      clearInterval(rampTimer.current)
      rampTimer.current = null
    }
    setWaterfallActive(false)
  }, [])

  const resetGesture = useCallback(() => {
    stopOffering()
    setPhase('idle')
    setActiveDirection(null)
    setOfferAmount(0)
    setShowCross(false)
    setIsDeepHold(false)
    didArmedRef.current = false
  }, [stopOffering])

  const fireAction = useCallback(
    (action: ButtonAction) => {
      callbacks.onAction?.(action)
      if (action.type === 'like') {
        const next = !liked
        if (onLikeToggle) {
          onLikeToggle(next)
        } else {
          setLikedInternal(next)
          setLikeCountInternal((c) => Math.max(0, c + (next ? 1 : -1)))
        }
        if (next) {
          callbacks.onLike?.()
          haptic.light()
        } else {
          callbacks.onUnlike?.()
        }
        return
      }
      if (action.type === 'noop') return
      haptic.light()
    },
    [callbacks, haptic, liked, onLikeToggle],
  )

  const resolveTapChain = useCallback(() => {
    const times = tapTimes.current
    tapTimes.current = []
    if (times.length === 0) return
    const span = times[times.length - 1] - times[0]
    let trigger: 'tap' | 'double_tap' | 'triple_tap' = 'tap'
    if (times.length >= 3 && span <= configRef.current.thresholds.tripleTapMs) {
      trigger = 'triple_tap'
    } else if (times.length >= 2 && span <= configRef.current.thresholds.doubleTapMs) {
      trigger = 'double_tap'
    }
    const action = bindingFor(configRef.current, trigger)
    if (action) fireAction(action)
  }, [fireAction])

  const applyRampAmount = useCallback((step: number) => {
    const cfg = configRef.current
    const dir = activeDirectionRef.current
    if (!dir) return
    const coin = coinFromDirection(cfg, dir)
    if (!coin) return
    const raw = rampAmount(step, cfg.ramp, isDeepHoldRef.current)
    const clamped = clampTipAmount(raw, coin, balanceLimitsRef.current, cfg.ramp.maxAmount)
    setOfferAmount(clamped)
  }, [])

  const startRamp = useCallback(
    (direction: SwipeDirection) => {
      const cfg = configRef.current
      const coin = coinFromDirection(cfg, direction)
      if (!coin) return
      setActiveDirection(direction)
      activeDirectionRef.current = direction
      setPhase('offering')
      setWaterfallActive(true)
      offeringStarted.current = Date.now()
      stopOffering()
      rampTimer.current = setInterval(() => {
        const elapsed = Date.now() - offeringStarted.current
        const step = rampStepIndex(elapsed)
        applyRampAmount(step)
      }, 120)
    },
    [applyRampAmount, stopOffering],
  )

  const commitOffer = useCallback(() => {
    const dir = activeDirectionRef.current
    if (!dir || offerAmount <= 0) {
      resetGesture()
      return
    }
    const coin = coinFromDirection(configRef.current, dir)
    if (!coin) {
      resetGesture()
      return
    }
    const offer: OfferSession = {
      id: newOfferId(),
      coin,
      amount: offerAmount,
      direction: dir,
      status: 'review',
      createdAt: Date.now(),
    }
    setPhase('review')
    stopOffering()
    haptic.success()
    callbacks.onOfferReview?.(offer)
  }, [callbacks, haptic, offerAmount, resetGesture, stopOffering])

  const onPointerDown = useCallback(
    (clientX: number, clientY: number) => {
      clearTimers()
      didArmedRef.current = false
      pointerStart.current = { x: clientX, y: clientY, t: Date.now() }

      const builderMs = configRef.current.thresholds.builderHoldMs ?? 1000
      if (configRef.current.id === 'controls') {
        builderTimer.current = setTimeout(() => {
          callbacks.onBuilderHold?.()
          haptic.medium()
        }, builderMs)
        return
      }

      if (!enableOfferMode) return

      setPhase('arming')
      armTimer.current = setTimeout(() => {
        didArmedRef.current = true
        setPhase('armed')
        setShowCross(true)
        haptic.medium()
        deepTimer.current = setTimeout(() => {
          setIsDeepHold(true)
          isDeepHoldRef.current = true
          haptic.heavy()
        }, configRef.current.thresholds.deepHoldMs)
      }, configRef.current.thresholds.armMs)
    },
    [callbacks, clearTimers, enableOfferMode, haptic],
  )

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!enableOfferMode || !didArmedRef.current) return
      const dx = clientX - pointerStart.current.x
      const dy = clientY - pointerStart.current.y
      const dir = resolveDirection(dx, dy, configRef.current.thresholds.directionThresholdPx)

      if (!dir) {
        if (phaseRef.current === 'offering') {
          stopOffering()
          setPhase('armed')
          setActiveDirection(null)
          activeDirectionRef.current = null
          setOfferAmount(0)
          setWaterfallActive(false)
        }
        return
      }

      if (phaseRef.current !== 'offering' || activeDirectionRef.current !== dir) {
        startRamp(dir)
      }
    },
    [enableOfferMode, startRamp, stopOffering],
  )

  const onPointerUp = useCallback(() => {
    clearTimers()

    if (configRef.current.id === 'controls') {
      const heldMs = Date.now() - pointerStart.current.t
      if (heldMs < (configRef.current.thresholds.builderHoldMs ?? 1000)) {
        tapTimes.current.push(Date.now())
        if (tapResolveTimer.current) clearTimeout(tapResolveTimer.current)
        tapResolveTimer.current = setTimeout(() => {
          resolveTapChain()
        }, configRef.current.thresholds.doubleTapMs + 40)
      }
      return
    }

    const heldMs = Date.now() - pointerStart.current.t

    if (didArmedRef.current) {
      if (phaseRef.current === 'offering' && offerAmount > 0) {
        commitOffer()
      } else {
        resetGesture()
      }
      return
    }

    if (heldMs < configRef.current.thresholds.armMs) {
      tapTimes.current.push(Date.now())
      if (tapResolveTimer.current) clearTimeout(tapResolveTimer.current)
      tapResolveTimer.current = setTimeout(() => {
        resolveTapChain()
        setPhase('idle')
      }, configRef.current.thresholds.doubleTapMs + 40)
    } else {
      setPhase('idle')
    }
  }, [clearTimers, commitOffer, offerAmount, resetGesture, resolveTapChain])

  const onPointerCancel = useCallback(() => {
    clearTimers()
    resetGesture()
  }, [clearTimers, resetGesture])

  const displayLabel =
    phase === 'offering' || phase === 'armed'
      ? offerAmount > 0
        ? `+${offerAmount}`
        : likeCount.toLocaleString()
      : likeCount.toLocaleString()

  return {
    phase,
    liked,
    likeCount,
    offerAmount,
    activeDirection,
    isDeepHold,
    showCross,
    waterfallActive,
    displayLabel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    resetInteraction: resetGesture,
    setPhase,
    setOfferAmount,
  }
}
