import { describe, expect, it } from 'vitest'
import { homeScreenForAppMode, PRODUCT_HOME_SCREEN, screenForTab } from './productEntryScreen'

describe('productEntryScreen', () => {
  it('uses immersive feed as product home', () => {
    expect(PRODUCT_HOME_SCREEN).toBe('immersive-feed')
  })

  it('routes product feed tab to immersive feed', () => {
    expect(screenForTab('feed', 'product')).toBe('immersive-feed')
    expect(screenForTab('feed', 'presenter')).toBe('feed')
  })

  it('routes product earn tab to immersive promo', () => {
    expect(screenForTab('earn', 'product')).toBe('immersive-promo')
  })

  it('home screen follows app mode', () => {
    expect(homeScreenForAppMode('product')).toBe('immersive-feed')
    expect(homeScreenForAppMode('presenter')).toBe('feed')
  })
})
