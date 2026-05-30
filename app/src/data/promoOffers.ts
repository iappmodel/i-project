import type { Offer } from '../state/types'
import { DEFAULT_SPONSORED_OFFER } from './demoData'
import { DEMO_IMMERSIVE_MEDIA } from './immersiveFeedContext'

export type PromoOfferKind = 'sponsored' | 'brand' | 'local'

export interface PromoOffer extends Offer {
  kind: PromoOfferKind
  distanceLabel?: string
}

/** Demo sponsor briefs — pairs with `promo_dock_explainer.html` */
export const PROMO_MARKETPLACE_OFFERS: PromoOffer[] = [
  {
    ...DEFAULT_SPONSORED_OFFER,
    kind: 'sponsored',
  },
  {
    id: DEMO_IMMERSIVE_MEDIA.contentId,
    brand: DEMO_IMMERSIVE_MEDIA.creatorName,
    title: 'Sunset · in-feed sponsored watch',
    description: 'RAFAELO creator spot — watch from immersive feed with consent gate.',
    platform: 'In-app · Sponsored',
    rewardICoins: 12,
    sponsorLabel: 'Sponsored',
    platformCode: 'IM',
    watchDuration: '0:45',
    thumbnailGradient: 'linear-gradient(160deg,#1a1030,#0a1520,#2d1b4e)',
    creatorHandle: DEMO_IMMERSIVE_MEDIA.creatorName,
    campaignTagline: 'Picture 2 immersive path',
    kind: 'sponsored',
  },
  {
    id: 'adidas-ultraboost-spring',
    brand: 'Adidas Running',
    title: 'Ultraboost · spring tempo series',
    description: 'Short-form brand story — verify attention to unlock icoin reward.',
    platform: 'YouTube · Brand',
    rewardICoins: 3,
    sponsorLabel: 'Brand story',
    platformCode: 'YT',
    watchDuration: '2:15',
    thumbnailGradient: 'linear-gradient(135deg,#0a1520,#1a2840,#0d1a1a)',
    creatorHandle: 'Adidas · Official',
    kind: 'brand',
  },
  {
    id: 'cape-town-coffee-local',
    brand: 'Origin Coffee Roasters',
    title: 'Neighbourhood pickup · Cape Town',
    description: 'Local promo — map placement deferred; demo uses flat list.',
    platform: 'Local · Map (soon)',
    rewardICoins: 1,
    sponsorLabel: 'Local promo',
    platformCode: 'LC',
    watchDuration: '0:30',
    thumbnailGradient: 'linear-gradient(135deg,#1a1008,#2d1b0e,#0a1520)',
    creatorHandle: 'Origin · V&A Waterfront',
    kind: 'local',
    distanceLabel: '1.2 km',
  },
]

export function promoKindLabel(kind: PromoOfferKind): string {
  if (kind === 'sponsored') return 'Sponsored'
  if (kind === 'brand') return 'Brand'
  return 'Local'
}
