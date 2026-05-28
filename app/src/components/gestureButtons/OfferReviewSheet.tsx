import { useEffect, useState } from 'react'
import { formatCoinLabel } from '../../lib/gestureButtons/offerService'
import type { OfferSession } from '../../lib/gestureButtons/types'

const PRESETS = [5, 13, 49] as const

type Props = {
  offer: OfferSession | null
  open: boolean
  maxAmount?: number
  onClose: () => void
  onAmountChange: (amount: number) => void
  onConfirm: () => void
}

export function OfferReviewSheet({
  offer,
  open,
  maxAmount = 99,
  onClose,
  onAmountChange,
  onConfirm,
}: Props) {
  const [manual, setManual] = useState('')

  useEffect(() => {
    if (open && offer) setManual(String(offer.amount))
  }, [open, offer])

  if (!open || !offer) return null

  const coinLabel = offer.coin === 'icoin' ? 'ic' : 'v'

  const applyAmount = (n: number) => {
    const clamped = Math.min(maxAmount, Math.max(1, Math.floor(n)))
    onAmountChange(clamped)
    setManual(String(clamped))
  }

  return (
    <div
      className="offer-review-backdrop"
      role="dialog"
      aria-label="Review offer"
      onClick={onClose}
    >
      <div className="offer-review-sheet" onClick={(e) => e.stopPropagation()}>
        <p className="offer-review-sheet__eyebrow">REWARD</p>
        <h2 className="offer-review-sheet__title mono">
          {offer.amount}
          {coinLabel}
        </h2>
        <p className="offer-review-sheet__sub">
          Swipe {offer.direction === 'up' ? 'up' : 'down'} · {formatCoinLabel(offer.coin, offer.amount)}
        </p>

        <div className="offer-review-presets">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className={`offer-review-preset ${offer.amount === n ? 'offer-review-preset--active' : ''}`}
              onClick={() => applyAmount(n)}
            >
              {n}
              {coinLabel}
            </button>
          ))}
        </div>

        <label className="offer-review-manual">
          <span>Amount</span>
          <input
            type="number"
            min={1}
            max={maxAmount}
            value={manual}
            onChange={(e) => {
              setManual(e.target.value)
              const n = parseInt(e.target.value, 10)
              if (Number.isFinite(n)) applyAmount(n)
            }}
          />
        </label>

        <input
          type="range"
          className="offer-review-slider"
          min={1}
          max={maxAmount}
          value={offer.amount}
          onChange={(e) => applyAmount(Number(e.target.value))}
          aria-label="Offer amount"
        />

        <div className="offer-review-actions">
          <button type="button" className="ds-btn ds-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ds-btn offer-review-send" onClick={onConfirm}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
