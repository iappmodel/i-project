import { useInvestorDemo } from '../useInvestorDemoState'

const ACTION_BUTTONS = [
  { id: 'convert', icon: '⇄', label: 'Convert', color: '#4ade80' },
  { id: 'withdraw', icon: '↓', label: 'Withdraw', color: '#00e5ff' },
  { id: 'pay', icon: '→', label: 'Pay', color: '#ffb300' },
  { id: 'tip', icon: '♥', label: 'Tip', color: '#ff4d6d' },
]

function txColor(kind: string) {
  if (kind === 'positive') return 'var(--icoin-primary)'
  if (kind === 'negative') return 'var(--accent-rose)'
  return 'var(--accent-amber)'
}

function txBg(kind: string) {
  if (kind === 'positive') return 'rgba(74, 222, 128, 0.08)'
  if (kind === 'negative') return 'rgba(255, 77, 109, 0.08)'
  return 'rgba(255, 179, 0, 0.08)'
}

function txIcon(kind: string) {
  if (kind === 'positive') return '+'
  if (kind === 'negative') return '−'
  return '◷'
}

export function InvestorWalletView() {
  const { state, goView, showToast, setPresenterStep } = useInvestorDemo()

  const { walletBalance, pendingBalance, lifetimeEarned, transactions } = state

  const balanceFmt = walletBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const pendingFmt = pendingBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const lifetimeFmt = lifetimeEarned.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const handleAction = (id: string) => {
    showToast(`${id.charAt(0).toUpperCase() + id.slice(1)} — available in full investor walkthrough`)
  }

  const handleBackToFeed = () => {
    setPresenterStep(1)
    goView('feed')
  }

  return (
    <div className="id-wallet">
      {/* Header */}
      <div className="id-wallet__header">
        <p className="id-wallet__greeting">Attention Wallet · Simulated</p>
        <p className="id-wallet__title">[ i ] Wallet</p>

        {/* Balance card */}
        <div className="id-wallet__balance-card">
          <p className="id-wallet__balance-label">Available balance</p>
          <p className="id-wallet__balance-num">
            <span>iC</span>
            {balanceFmt}
          </p>
          <div className="id-wallet__today-pill">
            <span className="id-wallet__today-dot" aria-hidden />
            <span className="id-wallet__today-label">+{(walletBalance - 3.65 + 0.25).toFixed(2)} iC today</span>
          </div>

          <div className="id-wallet__stats">
            <div className="id-wallet__stat">
              <p className="id-wallet__stat-label">Pending</p>
              <p className="id-wallet__stat-val" style={{ color: 'var(--accent-amber)' }}>
                {pendingFmt}
              </p>
            </div>
            <div className="id-wallet__stat">
              <p className="id-wallet__stat-label">Lifetime</p>
              <p className="id-wallet__stat-val" style={{ color: 'var(--text-secondary)' }}>
                {lifetimeFmt}
              </p>
            </div>
            <div className="id-wallet__stat">
              <p className="id-wallet__stat-label">Trust tier</p>
              <p className="id-wallet__stat-val" style={{ color: 'var(--accent-cyan)' }}>
                Verified
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="id-wallet__actions">
        {ACTION_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            className="id-wallet__action-btn"
            onClick={() => handleAction(btn.id)}
            aria-label={btn.label}
          >
            <div
              className="id-wallet__action-icon"
              style={{ background: `${btn.color}14`, color: btn.color }}
              aria-hidden
            >
              {btn.icon}
            </div>
            <span className="id-wallet__action-label">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Transactions */}
      <div className="id-wallet__section-header">
        <p className="id-wallet__section-title">Recent activity</p>
        <span className="id-wallet__section-link">View all</span>
      </div>

      <div className="id-wallet__txns">
        {transactions.map((tx) => (
          <div key={tx.id} className="id-wallet__tx">
            <div
              className="id-wallet__tx-dot"
              style={{ background: txBg(tx.kind), color: txColor(tx.kind) }}
              aria-hidden
            >
              {txIcon(tx.kind)}
            </div>
            <div className="id-wallet__tx-info">
              <p className="id-wallet__tx-source">{tx.source}</p>
              <p className="id-wallet__tx-time">{tx.timeLabel}</p>
            </div>
            <span
              className="id-wallet__tx-amount"
              style={{ color: txColor(tx.kind) }}
            >
              {tx.amountDisplay}
            </span>
          </div>
        ))}

        {/* Disclaimer */}
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          textAlign: 'center',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginTop: 16,
          marginBottom: 8,
        }}>
          Simulated balances · no real value
        </p>
      </div>

      {/* Back to feed sticky button */}
      <button
        type="button"
        className="id-wallet__back-btn"
        onClick={handleBackToFeed}
        aria-label="Back to feed"
      >
        ← Back to Feed
      </button>
    </div>
  )
}
