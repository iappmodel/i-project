import { useCallback, useState } from 'react'
import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { submitPromotionReview } from '../../services/promo.service'

type Props = {
  open: boolean
  promotionId: string | null
  promotionTitle?: string
  onClose: () => void
  onToast?: (msg: string) => void
  demoCheckedIn?: boolean
}

export function ImmersivePromoReviewSheet({
  open,
  promotionId,
  promotionTitle,
  onClose,
  onToast,
  demoCheckedIn = true,
}: Props) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!promotionId) return
    if (!demoCheckedIn) {
      onToast?.('Check in first (demo: enabled)')
      return
    }
    setSubmitting(true)
    try {
      const result = await submitPromotionReview({
        promotionId,
        rating,
        comment: comment.trim() || undefined,
      })
      if (result.success) {
        onToast?.('Review submitted')
        setComment('')
        onClose()
      } else {
        onToast?.(result.error ?? 'Review saved locally (demo)')
        onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }, [comment, demoCheckedIn, onClose, onToast, promotionId, rating])

  return (
    <ImmersiveGlassSheet open={open} title="Rate this promo" onClose={onClose}>
      <div className="promo-review-sheet">
        {promotionTitle ? <p className="promo-review-sheet__title">{promotionTitle}</p> : null}
        <div className="promo-review-sheet__stars" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`promo-review-sheet__star${n <= rating ? ' promo-review-sheet__star--on' : ''}`}
              onClick={() => setRating(n)}
              aria-label={`${n} stars`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          className="promo-review-sheet__input"
          rows={3}
          placeholder="Optional comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
        />
        <Button variant="secondary" disabled={submitting || !promotionId} onClick={() => void handleSubmit()}>
          {submitting ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </ImmersiveGlassSheet>
  )
}
