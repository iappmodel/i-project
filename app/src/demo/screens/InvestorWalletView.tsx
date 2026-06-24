import { useMemo } from 'react'
import {
  WALLET_TABS,
  computeWalletTabSnapshot,
  sentTransactionMeta,
  type InvestorTransaction,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

const ACTION_BUTTONS = [
  { id: 'convert', icon: '⇄', label: 'Convert', color: '#4ade80' },
  { id: 'withdraw', icon: '↓', label: 'Withdraw', color: '#00e5ff' },
  { id: 'pay', icon: '→', label: 'Pay', color: '#ffb300' },
  { id: 'tip', icon: '♥', label: 'Tip', color: '#ff4d6d' },
]

const QUICK_ACTIONS = [
  { id: 'convert', icon: '⇄', label: 'Convert' },
  { id: 'pay', icon: '→', label: 'Pay' },
  { id: 'tip', icon: '♥', label: 'Tip' },
  { id: 'withdraw', icon: '↓', label: 'Withdraw' },
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
  if (txType === 'promo') return '◈'
  if (kind === 'positive') return '+'
  if (kind === 'negative') return '−'
  return '◷'
}

function txLatestClass(txType?: string): string {
  if (txType === 'convert') return ' id-wallet__tx--convert'
  if (txType === 'tip') return ' id-wallet__tx--tip'
  if (txType === 'pay') return ' id-wallet__tx--pay'
  if (txType === 'withdraw') return ' id-wallet__tx--withdraw'
  if (txType === 'promo') return ' id-wallet__tx--promo'
  return ''
}

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function InvestorWalletView() {
  const {
    state,
    goView,
    showToast,
    setPresenterStep,
    openConvert,
    openTip,
    openPay,
    openWithdraw,
    openACoins,
    openMoneyMap,
    openPOPLive,
    setWalletTab,
    openReceipt,
  } = useInvestorDemo()

  const {
    walletBalance,
    usableBalance,
    pendingBalance,
    lifetimeEarned,
    sessionEarned,
    transactions,
    campaign,
    rewardClaimed,
    tipConfirmed,
    lastTipAmount,
    payConfirmed,
    withdrawConfirmed,
    lastWithdrawAmount,
    verificationGates,
    walletTab,
  } = state

  const snapshot = useMemo(
    () =>
      computeWalletTabSnapshot({
        walletBalance,
        usableBalance,
        pendingBalance,
        lifetimeEarned,
        sessionEarned,
        transactions,
        campaign,
        rewardClaimed,
        tipConfirmed,
        lastTipAmount,
        payConfirmed,
        withdrawConfirmed,
        lastWithdrawAmount,
        verificationGates,
      }),
    [
      walletBalance,
      usableBalance,
      pendingBalance,
      lifetimeEarned,
      sessionEarned,
      transactions,
      campaign,
      rewardClaimed,
      tipConfirmed,
      lastTipAmount,
      payConfirmed,
      withdrawConfirmed,
      lastWithdrawAmount,
      verificationGates,
    ],
  )

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

  const handlePendingCta = (cta: 'moneyMap' | 'popLive') => {
    if (cta === 'moneyMap') {
      openMoneyMap()
      return
    }
    setPresenterStep(3)
    openPOPLive()
  }

  const renderTransaction = (tx: InvestorTransaction, index: number, list: InvestorTransaction[]) => {
    const isLatest = index === 0 && list[0]?.id === transactions[0]?.id && tx.timeLabel === 'Just now'
    return (
      <div
        key={tx.id}
        className={`id-wallet__tx${isLatest ? ' id-wallet__tx--latest' : ''}${isLatest ? txLatestClass(tx.txType) : ''}`}
      >
        {isLatest ? <span className="id-wallet__tx-badge">New</span> : null}
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
        {(tx.txType === 'convert' || tx.txType === 'tip' || tx.txType === 'pay' || tx.txType === 'withdraw') && (
          <button
            type="button"
            className="id-wallet__tx-receipt"
            onClick={() => openReceipt(tx.id, 'wallet')}
          >
            View receipt
          </button>
        )}
      </div>
    )
  }

  const overviewLinks = (
    <>
      <button type="button" className="id-wallet__acoins-link" onClick={openACoins}>
        <span className="id-wallet__acoins-icon" aria-hidden>A</span>
        <span className="id-wallet__acoins-text">
          <span className="id-wallet__acoins-title">ACoins / Value System</span>
          <span className="id-wallet__acoins-sub">See how verified attention becomes usable value</span>
        </span>
        <span className="id-wallet__acoins-arrow" aria-hidden>→</span>
      </button>

      <button type="button" className="id-wallet__map-link" onClick={openMoneyMap}>
        <span className="id-wallet__map-icon" aria-hidden>⇄</span>
        <span className="id-wallet__map-text">
          <span className="id-wallet__map-title">Money Movement Map</span>
          <span className="id-wallet__map-sub">See how verified value routes through [ i ]</span>
        </span>
        <span className="id-wallet__map-cta">View architecture</span>
      </button>
    </>
  )

  const actionRow = (
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
  )

  return (
    <div className="id-wallet">
      <div className="id-wallet__header">
        <p className="id-wallet__greeting">Investor Demo · Simulated</p>
        <p className="id-wallet__title">[ i ] Wallet</p>

        <div className="id-wallet__balance-card">
          <p className="id-wallet__balance-label">Verified balance · demo</p>
          <p className="id-wallet__balance-num">
            <span>iC</span>
            {fmt(walletBalance)}
          </p>
          {sessionEarned > 0 ? (
            <div className="id-wallet__today-pill">
              <span className="id-wallet__today-dot" aria-hidden />
              <span className="id-wallet__today-label">+{sessionEarned.toFixed(2)} iC this session</span>
            </div>
          ) : null}

          <div className="id-wallet__stats">
            <div className="id-wallet__stat">
              <p className="id-wallet__stat-label">Usable</p>
              <p className="id-wallet__stat-val" style={{ color: 'var(--icoin-primary)' }}>
                {fmt(usableBalance)}
              </p>
            </div>
            <div className="id-wallet__stat">
              <p className="id-wallet__stat-label">Pending</p>
              <p className="id-wallet__stat-val" style={{ color: 'var(--accent-amber)' }}>
                {fmt(pendingBalance)}
              </p>
            </div>
            <div className="id-wallet__stat">
              <p className="id-wallet__stat-label">Lifetime</p>
              <p className="id-wallet__stat-val" style={{ color: 'var(--text-secondary)' }}>
                {fmt(lifetimeEarned)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="id-wallet__tabs">
        {WALLET_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`id-wallet__tab${walletTab === tab.id ? ' active' : ''}`}
            onClick={() => setWalletTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="id-wallet__scroll">
        {walletTab === 'overview' ? (
          <>
            {overviewLinks}
            {actionRow}
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
            <div className="id-wallet__txns id-wallet__txns--inline">
              {transactions.map((tx, index) => renderTransaction(tx, index, transactions))}
            </div>
          </>
        ) : null}

        {walletTab === 'available' ? (
          <>
            <section className="id-wallet__panel">
              <p className="id-wallet__panel-title">Available value · preview</p>
              <div className="id-wallet__avail-grid">
                <div className="id-wallet__avail-cell highlight">
                  <span className="id-wallet__avail-key">Usable balance</span>
                  <span className="id-wallet__avail-val mono">{fmt(usableBalance)} iC</span>
                </div>
                <div className="id-wallet__avail-cell">
                  <span className="id-wallet__avail-key">Verified balance</span>
                  <span className="id-wallet__avail-val mono">{fmt(walletBalance)} iC</span>
                </div>
              </div>
              <p className="id-wallet__panel-note">
                Available value is simulated and ready for demo routing.
              </p>
            </section>

            <div className="id-wallet__quick-actions">
              {QUICK_ACTIONS.map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  className="id-wallet__quick-btn"
                  onClick={() => handleAction(btn.id, btn.label)}
                >
                  <span aria-hidden>{btn.icon}</span> {btn.label}
                </button>
              ))}
            </div>

            <div className="id-wallet__section-header">
              <p className="id-wallet__section-title">Available activity</p>
            </div>
            <div className="id-wallet__txns id-wallet__txns--inline">
              {snapshot.availableTransactions.length > 0 ? (
                snapshot.availableTransactions.map((tx, index) =>
                  renderTransaction(tx, index, snapshot.availableTransactions),
                )
              ) : (
                <p className="id-wallet__empty">No available routing preview yet · simulated</p>
              )}
            </div>
          </>
        ) : null}

        {walletTab === 'pending' ? (
          <section className="id-wallet__panel">
            <p className="id-wallet__panel-title">Pending review · simulated</p>
            <div className="id-wallet__pending-list">
              {snapshot.pendingItems.map((item) => (
                <div key={item.id} className="id-wallet__pending-card">
                  <div className="id-wallet__pending-top">
                    <span className="id-wallet__pending-source">{item.source}</span>
                    <span className="id-wallet__pending-pill">{item.status}</span>
                  </div>
                  <p className="id-wallet__pending-amt mono">{item.amount}</p>
                  <p className="id-wallet__pending-reason">{item.reason}</p>
                  <p className="id-wallet__pending-step">{item.reviewStep}</p>
                  <button
                    type="button"
                    className="id-wallet__pending-cta"
                    onClick={() => handlePendingCta(item.cta)}
                  >
                    {item.ctaLabel}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {walletTab === 'earned' ? (
          <>
            <section className="id-wallet__panel">
              <p className="id-wallet__panel-title">Total earned preview</p>
              <p className="id-wallet__earned-total mono">{fmt(snapshot.earnedTotal)} iC</p>
              <div className="id-wallet__breakdown">
                {[
                  { key: 'Watch', val: snapshot.earnedBreakdown.watch },
                  { key: 'iGo', val: snapshot.earnedBreakdown.igo },
                  { key: 'Campaign', val: snapshot.earnedBreakdown.campaign },
                  { key: 'Creator', val: snapshot.earnedBreakdown.creator },
                ].map((row) => (
                  <div key={row.key} className="id-wallet__breakdown-row">
                    <span>{row.key}</span>
                    <span className="mono">{fmt(row.val)} iC</span>
                  </div>
                ))}
              </div>
              <p className="id-wallet__panel-note">
                Includes watch rewards, promo/iGo, campaign preview, and ACoins-generated value.
              </p>
            </section>

            <div className="id-wallet__section-header">
              <p className="id-wallet__section-title">Earned credits</p>
            </div>
            <div className="id-wallet__txns id-wallet__txns--inline">
              {snapshot.earnedTransactions.length > 0 ? (
                snapshot.earnedTransactions.map((tx, index) =>
                  renderTransaction(tx, index, snapshot.earnedTransactions),
                )
              ) : (
                <p className="id-wallet__empty">No earned credits yet · complete a watch flow</p>
              )}
            </div>
          </>
        ) : null}

        {walletTab === 'sent' ? (
          <section className="id-wallet__panel">
            <p className="id-wallet__panel-title">Sent / routed · receipt preview</p>
            <div className="id-wallet__sent-list">
              {snapshot.sentTransactions.length > 0 ? (
                snapshot.sentTransactions.map((tx) => {
                  const meta = sentTransactionMeta(tx)
                  return (
                    <div key={tx.id} className="id-wallet__sent-card">
                      <div className="id-wallet__sent-top">
                        <span className="id-wallet__sent-type">{tx.source}</span>
                        <span className="id-wallet__sent-status">{meta.status}</span>
                      </div>
                      <p className="id-wallet__sent-dest">→ {meta.destination}</p>
                      <div className="id-wallet__sent-bottom">
                        <span className="id-wallet__sent-time">{tx.timeLabel}</span>
                        <span className="id-wallet__sent-amt mono">{tx.amountDisplay}</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="id-wallet__empty">No sent transactions yet · try Tip, Pay, or Withdraw</p>
              )}
            </div>
          </section>
        ) : null}

        {walletTab === 'review' ? (
          <>
            <section className="id-wallet__panel">
              <p className="id-wallet__panel-title">Validation pipeline · preview</p>
              <p className="id-wallet__panel-note id-wallet__panel-note--top">
                POP review, fraud screen, session integrity, and wallet release — simulated only.
              </p>
              <div className="id-wallet__pipeline">
                {snapshot.reviewPipeline.map((step) => (
                  <div key={step.id} className={`id-wallet__pipeline-step ${step.status}`}>
                    <span className="id-wallet__pipeline-dot" aria-hidden />
                    <div className="id-wallet__pipeline-text">
                      <span className="id-wallet__pipeline-label">{step.label}</span>
                      <span className="id-wallet__pipeline-sub">{step.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="id-wallet__route-row">
              <button type="button" className="id-wallet__route-btn" onClick={() => { setPresenterStep(3); openPOPLive() }}>
                Open POP Live
              </button>
              <button type="button" className="id-wallet__route-btn" onClick={openMoneyMap}>
                Open Money Map
              </button>
              <button type="button" className="id-wallet__route-btn" onClick={openACoins}>
                Open ACoins
              </button>
            </div>
          </>
        ) : null}

        <p className="id-wallet__disclaimer">
          Simulated wallet states. No real banking, settlement, or financial movement.
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
