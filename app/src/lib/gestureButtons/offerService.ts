import type { CoinType, OfferSession, OfferStatus } from './types'

export function newOfferId(): string {
  return `offer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function createOfferDraft(
  coin: CoinType,
  amount: number,
  direction: OfferSession['direction'],
  meta?: { contentId?: string; creatorId?: string },
): OfferSession {
  return {
    id: newOfferId(),
    coin,
    amount,
    direction,
    status: 'draft',
    createdAt: Date.now(),
    contentId: meta?.contentId,
    creatorId: meta?.creatorId,
  }
}

export function transitionOffer(
  offer: OfferSession,
  status: OfferStatus,
  patch?: Partial<Pick<OfferSession, 'amount'>>,
): OfferSession {
  return { ...offer, ...patch, status }
}

export function formatCoinLabel(coin: CoinType, amount: number): string {
  const suffix = coin === 'icoin' ? 'ic' : 'v'
  return `${amount}${suffix}`
}
