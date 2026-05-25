import type { ReactNode } from 'react'
import { useDemo } from '../state/useDemo'

type Props = {
  children: ReactNode
}

export function AppShell({ children }: Props) {
  const { appMode } = useDemo()

  return (
    <div className="app-shell">
      <header className="app-shell__titlebar">
        <p className="app-shell__kicker">
          {appMode === 'presenter' ? 'Investor presenter · Loop 1' : 'Product shell · 4-tab IA'}
        </p>
        <h1 className="app-shell__title">[ i ] Attention Wallet</h1>
      </header>
      <div className="app-shell__host">{children}</div>
    </div>
  )
}
