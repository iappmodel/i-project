import type { PromoOffer } from '../../data/promoOffers'

type Props = {
  offers: PromoOffer[]
  hasMapToken: boolean
}

export function ImmersivePromoMapSheetBody({ offers, hasMapToken }: Props) {
  if (hasMapToken) {
    return (
      <p className="immersive-glass-sheet__hint">
        Mapbox token active — embed map in production build.
      </p>
    )
  }

  return (
    <ul className="promo-map-list">
      {offers.slice(0, 12).map((o) => (
        <li key={o.id} className="promo-map-list__item">
          <span className="promo-map-list__brand">{o.brand}</span>
          <span className="promo-map-list__title">{o.title}</span>
          {o.distanceLabel ? (
            <span className="promo-map-list__dist mono">{o.distanceLabel}</span>
          ) : null}
        </li>
      ))}
      {offers.length === 0 ? (
        <li className="promo-map-list__empty">No nearby promos — demo list</li>
      ) : null}
    </ul>
  )
}
