import { useState } from 'react'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { useDemo } from '../state/useDemo'

function actDot(kind: string) {
  if (kind === 'positive') return 'var(--icoin-primary)'
  if (kind === 'negative') return 'var(--accent-rose)'
  return 'var(--accent-amber)'
}

export function WalletScreen() {
  const { walletBalance, pendingBalance, aCoins, iCoins, transactions, setScreen, jumpFeed } = useDemo()
  const [showAll, setShowAll] = useState(false)

  const usdFmt = walletBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const visible = showAll ? transactions : transactions.slice(0, 5)

  return (
    <PhoneFrame scroll>
      <p className="wallet-ui-greeting">Good afternoon · sandbox</p>
      <p className="balance-label-wallet-ui">estimated value</p>
      <div className="balance-num-wallet-ui mono">${usdFmt}</div>

      <div className="action-row-wallet-ui">
        <button type="button" className="act-btn-wu" onClick={() => setScreen('convert')}>
          <span className="act-icon-wu" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--vcoin-primary)' }}>
            ⇄
          </span>
          <span className="act-lbl-wu">Convert</span>
        </button>
        <button type="button" className="act-btn-wu" onClick={() => setScreen('withdraw-preview')}>
          <span className="act-icon-wu" style={{ background: 'rgba(74,222,128,0.12)', color: 'var(--icoin-primary)' }}>
            ↗
          </span>
          <span className="act-lbl-wu">Withdraw</span>
        </button>
        <button type="button" className="act-btn-wu" onClick={() => setScreen('convert')}>
          <span className="act-icon-wu" style={{ background: 'rgba(0,229,255,0.12)', color: 'var(--accent-cyan)' }}>
            ◎
          </span>
          <span className="act-lbl-wu">Pay</span>
        </button>
      </div>

      <section className="coin-split">
        <div className="coin-card">
          <span className="cc-label">acoins</span>
          <span className="cc-val muted-num mono">{aCoins.toLocaleString()}</span>
        </div>
        <div className="coin-card">
          <span className="cc-label">icoins</span>
          <span className="cc-val ic mono">{iCoins.toLocaleString()}</span>
        </div>
      </section>

      <div className="pending-strip">
        <span className="ps-dot" aria-hidden />
        <span className="ps-text">Pending attestations settling</span>
        <span className="ps-val mono">{pendingBalance} ℏ</span>
      </div>

      <div className="section-hdr-wu">
        <span className="sec-title-wu">Activity</span>
        <button type="button" className="sec-link-wu" onClick={() => setShowAll(true)}>
          See all
        </button>
      </div>

      <div className="activity-stack-wu">
        {visible.map((t) => (
          <button key={t.id} type="button" className={`activity-card-wu ${t.kind}`} onClick={() => setScreen('wallet')}>
            <span className="act-dot-wu" style={{ background: actDot(t.kind) }} />
            <div className="act-body-wu">
              <p className="act-title-wu">{t.source}</p>
              <p className="act-time-wu">{t.timeLabel}</p>
            </div>
            <span className={`act-amount-wu mono ${t.kind}`}>{t.amountDisplay}</span>
          </button>
        ))}
      </div>

      <Button className="prot-cta-flat" style={{ marginTop: 16 }} onClick={() => setScreen('withdraw-preview')}>
        Preview ACH withdraw
      </Button>
      <Button variant="secondary" style={{ marginTop: 8 }} onClick={() => setScreen('creator-economics')}>
        Creator economics
      </Button>
      <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => jumpFeed()}>
        Earn more in feed
      </Button>
      <SourceEvidence
        paths={[
          '04_wallet_payments/iapp_wallet_dashboard.html',
          '04_wallet_payments/iapp_wallet_ui (1).html',
          '04_wallet_payments/wallet_pending_tab.html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/WalletScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
