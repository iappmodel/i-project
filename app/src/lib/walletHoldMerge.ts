import type { PopPendingHold } from './popValidator'
import type { Transaction } from '../state/types'

export function sumPendingIcoins(holds: PopPendingHold[]): number {
  return holds
    .filter((h) => h.holdStatus === 'pending' && h.currency === 'icoin')
    .reduce((sum, h) => sum + h.amount, 0)
}

export function sumPendingVcoins(holds: PopPendingHold[]): number {
  return holds
    .filter((h) => h.holdStatus === 'pending' && h.currency === 'vicoin')
    .reduce((sum, h) => sum + h.amount, 0)
}

export function mergeHoldTransactions(
  existing: Transaction[],
  holds: PopPendingHold[],
): Transaction[] {
  const popTx = holds.map((h) => {
    const coin = h.currency === 'vicoin' ? 'v' : 'i'
    const settled = h.holdStatus === 'settled'
    return {
      id: `pop-${h.sessionId}`,
      source: h.offerId.replace(/-watch$/, '').replace(/-/g, ' '),
      timeLabel: settled ? 'Settled · POP' : 'Validating · POP',
      amountDisplay: settled
        ? `+${h.amount} ${coin}`
        : `+${h.amount} ${coin} pending`,
      kind: settled ? ('positive' as const) : ('pending' as const),
    }
  })

  const withoutPop = existing.filter((t) => !t.id.startsWith('pop-'))
  return [...popTx, ...withoutPop]
}

export function countPendingAttestations(holds: PopPendingHold[]): number {
  return holds.filter((h) => h.holdStatus === 'pending').length
}
