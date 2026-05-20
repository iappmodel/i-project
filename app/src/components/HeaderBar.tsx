import type { ReactNode } from 'react'
import { CurrencyChip } from './CurrencyChip'

type Props = {
  walletBalance?: number
  onWalletClick?: () => void
  trailing?: ReactNode
}

export function HeaderBar({ walletBalance, onWalletClick, trailing }: Props) {
  return (
    <header className="ds-header-bar top-bar">
      <div className="ds-header-bar__logo logo-mark">[ i ]</div>
      <div className="top-right">
        {walletBalance !== undefined && onWalletClick && (
          <CurrencyChip value={walletBalance} onClick={onWalletClick} />
        )}
        {trailing}
      </div>
    </header>
  )
}
