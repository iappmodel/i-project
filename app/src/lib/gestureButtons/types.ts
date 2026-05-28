export type CoinType = 'vicoin' | 'icoin'

export type GestureTrigger =
  | 'tap'
  | 'double_tap'
  | 'triple_tap'
  | 'hold_arm'
  | 'hold_deep'
  | 'swipe_up'
  | 'swipe_down'
  | 'swipe_left'
  | 'swipe_right'

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

export type ButtonAction =
  | { type: 'like' }
  | { type: 'tip'; coin: CoinType }
  | { type: 'save' }
  | { type: 'share' }
  | { type: 'noop' }
  | { type: 'custom'; id: string }

export type ButtonIcon = 'heart' | 'comment' | 'share' | 'more' | 'plus'

export interface GestureBinding {
  trigger: GestureTrigger
  action: ButtonAction
}

export interface ButtonThresholds {
  armMs: number
  deepHoldMs: number
  directionThresholdPx: number
  doubleTapMs: number
  tripleTapMs: number
  /** Long-press to open builder (controls only) */
  builderHoldMs?: number
}

export interface ButtonRampConfig {
  preset: 'gentle' | 'standard' | 'aggressive'
  minAmount: number
  maxAmount: number
}

export interface ButtonPosition {
  x: number
  y: number
}

export interface ButtonChrome {
  icon: ButtonIcon
  glassOpacity: number
  size: 'sm' | 'md' | 'lg'
}

export interface ButtonInstanceConfig {
  id: string
  presetId?: string
  label: string
  enabled: boolean
  chrome: ButtonChrome
  bindings: GestureBinding[]
  thresholds: ButtonThresholds
  ramp: ButtonRampConfig
  position?: ButtonPosition
}

export type GesturePhase = 'idle' | 'arming' | 'armed' | 'offering' | 'review'

export type OfferStatus = 'draft' | 'review' | 'validating' | 'settled' | 'cancelled'

export interface OfferSession {
  id: string
  coin: CoinType
  amount: number
  direction: SwipeDirection
  status: OfferStatus
  createdAt: number
  contentId?: string
  creatorId?: string
}

export interface WalletBalanceLimits {
  vicoin: number
  icoin: number
}

export function bindingFor(
  config: ButtonInstanceConfig,
  trigger: GestureTrigger,
): ButtonAction | null {
  return config.bindings.find((b) => b.trigger === trigger)?.action ?? null
}

export function coinFromDirection(
  config: ButtonInstanceConfig,
  direction: SwipeDirection,
): CoinType | null {
  const trigger =
    direction === 'up'
      ? 'swipe_up'
      : direction === 'down'
        ? 'swipe_down'
        : direction === 'left'
          ? 'swipe_left'
          : 'swipe_right'
  const action = bindingFor(config, trigger)
  return action?.type === 'tip' ? action.coin : null
}

export function clampTipAmount(
  amount: number,
  coin: CoinType,
  limits: WalletBalanceLimits,
  rampMax: number,
): number {
  const balance = coin === 'vicoin' ? limits.vicoin : limits.icoin
  return Math.min(Math.max(0, amount), rampMax, Math.floor(balance))
}
