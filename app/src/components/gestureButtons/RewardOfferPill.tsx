import type { OfferSession } from '../../lib/gestureButtons/types'

type Props = {
  offer: OfferSession | null
  onEdit?: () => void
  onCancel?: () => void
  onConfirm?: () => void
}

export function RewardOfferPill({ offer, onEdit, onCancel, onConfirm }: Props) {
  if (!offer || offer.status === 'cancelled') return null

  const coinLabel = offer.coin === 'icoin' ? 'ic' : 'v'
  const className = [
    'reward-offer-pill',
    offer.status === 'review' ? 'reward-offer-pill--review' : '',
    offer.status === 'settled' ? 'reward-offer-pill--settled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role="status"
      onClick={offer.status === 'review' ? onEdit : undefined}
      onKeyDown={(e) => e.key === 'Enter' && offer.status === 'review' && onEdit?.()}
    >
      <div className="reward-offer-pill__amount mono">
        {offer.amount} {coinLabel}
      </div>
      {offer.status === 'review' ? (
        <div className="reward-offer-pill__hint">Review · tap to edit</div>
      ) : null}
      {offer.status === 'validating' ? (
        <div className="reward-offer-pill__hint">Validating…</div>
      ) : null}
      {offer.status === 'review' ? (
        <div className="gesture-settings-actions" style={{ marginTop: 8 }}>
          <button type="button" className="ds-btn ds-btn--ghost" style={{ padding: '6px 10px', fontSize: 10 }} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="ds-btn" style={{ padding: '6px 10px', fontSize: 10 }} onClick={onConfirm}>
            Send
          </button>
        </div>
      ) : null}
    </div>
  )
}
