import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function AppShell({ children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-shell__titlebar">
        <p className="app-shell__kicker">Canonical investor MVP</p>
        <h1 className="app-shell__title">[ i ] Attention Wallet</h1>
      </header>
      <div className="app-shell__host">{children}</div>
    </div>
  )
}
