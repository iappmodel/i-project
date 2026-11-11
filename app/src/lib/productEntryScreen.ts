import type { AppMode, DemoScreenId, ProductTabId } from '../state/types'

/** Canonical consumer home — full-bleed immersive feed (IMMERSIVE_UI_DESIGN_LAW). */
export const PRODUCT_HOME_SCREEN: DemoScreenId = 'immersive-feed'

const PRESENTER_TAB_SCREENS: Record<ProductTabId, DemoScreenId> = {
  feed: 'feed',
  earn: 'earn',
  wallet: 'wallet',
  profile: 'profile',
}

const PRODUCT_TAB_SCREENS: Record<ProductTabId, DemoScreenId> = {
  feed: PRODUCT_HOME_SCREEN,
  earn: 'immersive-promo',
  wallet: 'wallet',
  profile: 'profile',
}

export function screenForTab(tab: ProductTabId, mode: AppMode): DemoScreenId {
  return mode === 'presenter' ? PRESENTER_TAB_SCREENS[tab] : PRODUCT_TAB_SCREENS[tab]
}

export function homeScreenForAppMode(mode: AppMode): DemoScreenId {
  return screenForTab('feed', mode)
}
