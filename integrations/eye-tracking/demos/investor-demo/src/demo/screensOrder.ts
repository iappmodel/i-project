import type { DemoScreenId } from './types'

/** Linear investor walkthrough order for Prev / Next controls */
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

export function flowIndex(screen: DemoScreenId): number {
  return DEMO_SCREEN_FLOW.indexOf(screen)
}
