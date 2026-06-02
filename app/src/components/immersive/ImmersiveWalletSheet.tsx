import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { formatCoinLabel } from '../../lib/gestureButtons/offerService'
import { useDemo } from '../../state/useDemo'

type Props = {
  open: boolean
  onClose: () => void
  onOpenFull?: () => void
  onConvert?: () => void
  onWithdraw?: () => void
}

export function ImmersiveWalletSheet({
  open,
  onClose,
  onOpenFull,
  onConvert,
  onWithdraw,
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
      <div className="immersive-glass-sheet__actions">
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
