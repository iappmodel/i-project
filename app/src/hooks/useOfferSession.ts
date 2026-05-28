import { useCallback, useState } from 'react'
import { sendTipDemo, sendTipToCreator } from '../services/tipCreator'
import { transitionOffer } from '../lib/gestureButtons/offerService'
import type { OfferSession } from '../lib/gestureButtons/types'

type Options = {
  contentId: string
  creatorId: string
  walletBackend: 'mock' | 'live'
  onSettled?: (offer: OfferSession) => void
  onError?: (message: string) => void
}

export function useOfferSession({
  contentId,
  creatorId,
  walletBackend,
  onSettled,
  onError,
}: Options) {
  const [offer, setOffer] = useState<OfferSession | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const openReview = useCallback((session: OfferSession) => {
    const review = transitionOffer(session, 'review')
    setOffer(review)
    setSheetOpen(true)
  }, [])

  const updateAmount = useCallback((amount: number) => {
    setOffer((prev) => (prev ? { ...prev, amount: Math.max(1, amount) } : null))
  }, [])

  const cancel = useCallback(() => {
    if (offer) setOffer(transitionOffer(offer, 'cancelled'))
    setSheetOpen(false)
    window.setTimeout(() => setOffer(null), 300)
  }, [offer])

  const confirm = useCallback(async () => {
    if (!offer || offer.status !== 'review') return

    setOffer(transitionOffer(offer, 'validating'))
    setSheetOpen(false)

    const payload = {
      contentId,
      creatorId,
      amount: offer.amount,
      coinType: offer.coin,
      idempotencyKey: offer.id,
    }

    const result =
      walletBackend === 'live'
        ? await sendTipToCreator(payload)
        : await sendTipDemo(payload)

    if (!result.success) {
      onError?.(result.error ?? 'Tip failed')
      setOffer(transitionOffer(offer, 'review'))
      setSheetOpen(true)
      return
    }

    const settled = transitionOffer(
      { ...offer, contentId, creatorId },
      'settled',
    )
    setOffer(settled)
    onSettled?.(settled)
    window.setTimeout(() => setOffer(null), 1400)
  }, [offer, contentId, creatorId, walletBackend, onSettled, onError])

  return {
    offer,
    sheetOpen,
    setSheetOpen,
    openReview,
    updateAmount,
    cancel,
    confirm,
  }
}
