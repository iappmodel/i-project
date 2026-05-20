import type { DemoScreenId } from './types'

/** Linear investor walkthrough order for Prev / Next controls — keep in sync with `DEMO_SCREEN_FLOW_LABELS`. */
export const DEMO_SCREEN_FLOW: DemoScreenId[] = [
  'splash',
  'feed',
  'offer-detail',
  'watch-verify',
  'verification-result',
  'reward-reveal',
  'wallet',
  'convert',
  'withdraw-preview',
  'creator-economics',
  'roadmap',
]

/** Readable step names for presenter UI — same sequence as Next. */
export const DEMO_SCREEN_FLOW_LABELS = [
  'Splash',
  'Feed',
  'Offer',
  'Watch',
  'Verify',
  'Reward',
  'Wallet',
  'Convert',
  'Withdraw',
  'Economics',
  'Roadmap',
] as const

export function flowIndex(screen: DemoScreenId): number {
  return DEMO_SCREEN_FLOW.indexOf(screen)
}

export function presenterFlowLegendShort(): string {
  return DEMO_SCREEN_FLOW_LABELS.join(' → ')
}
