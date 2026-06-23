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
  if (kind === 'neutral') return 'var(--accent-cyan)'
  return 'var(--accent-amber)'
}

function txBg(kind: string) {
  if (kind === 'positive') return 'rgba(74, 222, 128, 0.08)'
  if (kind === 'negative') return 'rgba(255, 77, 109, 0.08)'
  if (kind === 'neutral') return 'rgba(0, 229, 255, 0.08)'
  return 'rgba(255, 179, 0, 0.08)'
}

function txIcon(kind: string, txType?: string) {
  if (txType === 'convert') return '⇄'
  if (txType === 'tip') return '♥'
  if (txType === 'pay') return '→'
  if (txType === 'withdraw') return '↓'
  if (kind === 'positive') return '+'
  if (kind === 'negative') return '−'
  return '◷'
}

function txLatestClass(txType?: string): string {
  if (txType === 'convert') return ' id-wallet__tx--convert'
  if (txType === 'tip') return ' id-wallet__tx--tip'
  if (txType === 'pay') return ' id-wallet__tx--pay'
  if (txType === 'withdraw') return ' id-wallet__tx--withdraw'
  return ''
}

export function InvestorWalletView() {
  const { state, goView, showToast, setPresenterStep, openConvert, openTip, openPay, openWithdraw } = useInvestorDemo()

  const { walletBalance, usableBalance, pendingBalance, lifetimeEarned, sessionEarned, transactions } = state

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

  const sessionFmt = sessionEarned.toFixed(2)

  const usableFmt = usableBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const handleAction = (id: string, label: string) => {
    if (id === 'convert') {
      openConvert()
      return
    }
    if (id === 'tip') {
      openTip()
      return
    }
    if (id === 'pay') {
      openPay()
      return
    }
    if (id === 'withdraw') {
      openWithdraw()
      return
    }
    showToast(`${label} — full walkthrough`)
  }

  const handleBackToFeed = () => {
    setPresenterStep(1)
    goView('feed')
  }

  return (
    <div className="id-wallet">
      <div className="id-wallet__header">
        <p className="id-wallet__greeting">Investor Demo · Simulated</p>
        <p className="id-wallet__title">[ i ] Wallet</p>

        <div className="id-wallet__balance-card">
          <p className="id-wallet__balance-label">Verified balance · demo</p>
          <p className="id-wallet__balance-num">
            <span>iC</span>
            {balanceFmt}
          </p>
          {sessionEarned > 0 ? (
            <div className="id-wallet__today-pill">
              <span className="id-wallet__today-dot" aria-hidden />
              <span className="id-wallet__today-label">+{sessionFmt} iC this session</span>
            </div>
          ) : null}

          <div className="id-wallet__stats">
            <div className="id-wallet__stat">
              <p className="id-wallet__stat-label">Usable</p>
              <p className="id-wallet__stat-val" style={{ color: 'var(--icoin-primary)' }}>
                {usableFmt}
              </p>
            </div>
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
          </div>
        </div>
      </div>

      <div className="id-wallet__actions">
        {ACTION_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            className="id-wallet__action-btn"
            onClick={() => handleAction(btn.id, btn.label)}
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

      <div className="id-wallet__section-header">
        <p className="id-wallet__section-title">Recent activity</p>
        <button
          type="button"
          className="id-wallet__section-link"
          onClick={() => showToast('Full history — full walkthrough')}
        >
          View all
        </button>
      </div>

      <div className="id-wallet__txns">
        {transactions.map((tx, index) => {
          const isLatest = index === 0 && tx.timeLabel === 'Just now'
          return (
            <div
              key={tx.id}
              className={`id-wallet__tx${isLatest ? ' id-wallet__tx--latest' : ''}${isLatest ? txLatestClass(tx.txType) : ''}`}
            >
              {isLatest ? (
                <span className="id-wallet__tx-badge">New</span>
              ) : null}
              <div
                className="id-wallet__tx-dot"
                style={{ background: txBg(tx.kind), color: txColor(tx.kind) }}
                aria-hidden
              >
                {txIcon(tx.kind, tx.txType)}
              </div>
              <div className="id-wallet__tx-info">
                <p className="id-wallet__tx-source">{tx.source}</p>
                <p className="id-wallet__tx-time">{tx.timeLabel}</p>
              </div>
              <span className="id-wallet__tx-amount" style={{ color: txColor(tx.kind) }}>
                {tx.amountDisplay}
              </span>
            </div>
          )
        })}

        <p className="id-wallet__disclaimer">
          Simulated balances · no real value moved
        </p>
      </div>

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
