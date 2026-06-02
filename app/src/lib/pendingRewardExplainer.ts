import type { PopPendingHold } from './popValidator'

export interface PendingRewardExplanation {
  headline: string
  lines: string[]
}

function formatReleaseTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** User-facing copy for POP pending / appeal holds (Stage 8). */
export function explainPendingHold(hold: PopPendingHold): PendingRewardExplanation {
  const amount = `+${hold.amount} ${hold.currency === 'vicoin' ? 'VICOIN' : 'ICOIN'}`
  const release = formatReleaseTime(hold.releaseEligibleAt)

  const tier = hold.trustTierAtHold ?? 't0_new'
  const tierNote =
    tier === 't2_trusted'
      ? 'Trusted tier: fastest release when approved.'
      : tier === 't1_established'
        ? 'Established tier: moderate release delay after approval.'
        : 'New tier: longer release delay after approval (fraud protection).'

  if (hold.holdStatus === 'appeal_pending') {
    const appealExpiry = formatReleaseTime(hold.appealExpiresAt)
    return {
      headline: 'Under review — one re-verify available',
      lines: [
        tierNote,
        `${amount} is held while POP re-checks attention signals.`,
        appealExpiry
          ? `You may re-verify once before ${appealExpiry}; after that the hold expires without payout.`
          : 'You may re-verify once from Watch before the appeal window closes.',
        'This protects legit users when the first pass was uncertain.',
      ],
    }
  }

  if (hold.reviewStatus === 'escalated' || hold.reviewStatus === 'pending') {
    return {
      headline: 'Validating your attention proof',
      lines: [
        tierNote,
        `${amount} stays pending until the server finishes review.`,
        release
          ? `If approved, funds release after ${release} (trust-gated delay).`
          : 'If approved, funds release after the server release window.',
        'Weak attention or fraud flags can reduce or cancel the hold.',
      ],
    }
  }

  return {
    headline: 'Pending POP reward',
    lines: [
      tierNote,
      `${amount} · ${hold.reviewStatus} · ${hold.releaseStatus}`,
      release ? `Eligible to settle after ${release}.` : 'Tap Settle when review shows approved.',
    ],
  }
}
