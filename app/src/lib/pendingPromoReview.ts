const KEY = 'i-pending-promo-review'

export function setPendingPromoReview(promotionId: string) {
  try {
    sessionStorage.setItem(KEY, promotionId)
  } catch {
    /* ignore */
  }
}

export function consumePendingPromoReview(): string | null {
  try {
    const id = sessionStorage.getItem(KEY)
    if (id) sessionStorage.removeItem(KEY)
    return id
  } catch {
    return null
  }
}

export function peekPendingPromoReview(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}
