import { useEffect } from 'react'
import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { formatCoinLabel } from '../../lib/gestureButtons/offerService'
import { useWalletTransactions } from '../../hooks/useWalletTransactions'
import { useDemo } from '../../state/useDemo'

type Props = {
  open: boolean
  onClose: () => void
  onOpenFull?: () => void
  onConvert?: () => void
  onWithdraw?: () => void
  onPay?: () => void
}

function actDot(kind: string) {
  if (kind === 'positive') return 'var(--icoin-primary)'
  if (kind === 'negative') return 'var(--accent-rose)'
  return 'var(--accent-amber)'
}

export function ImmersiveWalletSheet({
  open,
  onClose,
  onOpenFull,
  onConvert,
  onWithdraw,
  onPay,
}: Props) {
  const {
    iCoins,
    iCoinsPending,
    aCoins,
    walletBalance,
    pendingBalance,
    proofFlash,
    walletBackend,
    proofEventsConnected,
    eloStatusLine,
    jumpEarn,
  } = useDemo()

  const { items, loading, refresh, isLive } = useWalletTransactions({
    limit: 12,
    enabled: open,
  })
  const recent = items.slice(0, 5)

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  return (
    <ImmersiveGlassSheet open={open} title="Wallet" onClose={onClose}>
      {proofFlash ? (
        <p className="immersive-glass-sheet__hint mono">{proofFlash}</p>
      ) : null}
      {walletBackend === 'live' && proofEventsConnected ? (
        <p className="immersive-glass-sheet__hint mono">Elo · {eloStatusLine}</p>
      ) : null}
      <div className="immersive-glass-sheet__grid">
        <div className="immersive-glass-sheet__stat">
          <span className="immersive-glass-sheet__label">Icoin</span>
          <span className="immersive-glass-sheet__value mono">{formatCoinLabel('icoin', iCoins)}</span>
          {iCoinsPending > 0 ? (
            <span className="immersive-glass-sheet__sub mono">+{iCoinsPending} pending</span>
          ) : null}
        </div>
        <div className="immersive-glass-sheet__stat">
          <span className="immersive-glass-sheet__label">Vicoin</span>
          <span className="immersive-glass-sheet__value mono">{formatCoinLabel('vicoin', aCoins)}</span>
        </div>
        <div className="immersive-glass-sheet__stat">
          <span className="immersive-glass-sheet__label">USD est.</span>
          <span className="immersive-glass-sheet__value mono">${walletBalance.toFixed(2)}</span>
          {pendingBalance > 0 ? (
            <span className="immersive-glass-sheet__sub mono">${pendingBalance.toFixed(2)} pending</span>
          ) : null}
        </div>
      </div>

      <div className="immersive-glass-sheet__section">
        <div className="immersive-glass-sheet__section-head">
          <span className="immersive-glass-sheet__label">Activity</span>
          {isLive ? <span className="immersive-glass-sheet__sub mono">live</span> : null}
        </div>
        {loading && recent.length === 0 ? (
          <p className="immersive-glass-sheet__hint mono">Loading…</p>
        ) : null}
        <ul className="immersive-glass-sheet__tx-list">
          {recent.map((tx) => (
            <li key={tx.id} className={`immersive-glass-sheet__tx immersive-glass-sheet__tx--${tx.kind}`}>
              <span className="immersive-glass-sheet__tx-dot" style={{ background: actDot(tx.kind) }} />
              <span className="immersive-glass-sheet__tx-body">
                <span className="immersive-glass-sheet__tx-source">{tx.source}</span>
                <span className="immersive-glass-sheet__tx-time mono">{tx.timeLabel}</span>
              </span>
              <span className="immersive-glass-sheet__tx-amt mono">{tx.amountDisplay}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="immersive-glass-sheet__actions">
        {onPay ? (
          <Button variant="secondary" onClick={onPay}>
            Pay
          </Button>
        ) : null}
        {onConvert ? (
          <Button variant="secondary" onClick={onConvert}>
            Convert
          </Button>
        ) : null}
        {onWithdraw ? (
          <Button variant="secondary" onClick={onWithdraw}>
            Withdraw
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => jumpEarn()}>
          Earn more
        </Button>
        {onOpenFull ? (
          <Button variant="ghost" onClick={onOpenFull}>
            Full wallet
          </Button>
        ) : null}
      </div>
    </ImmersiveGlassSheet>
  )
}
