import { useEffect, useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { formatCoinLabel } from '../lib/format'
import { getStripeReadiness, stripeReadinessLabel } from '../lib/stripeConfig'
import { usePayout } from '../hooks/usePayout'
import {
  ESTIMATED_ARRIVAL,
  getPayoutFee,
  MIN_PAYOUT_ICOIN,
  MIN_PAYOUT_ICOIN_DEMO,
  validatePayoutAmount,
  type PayoutMethod,
} from '../services/payout.service'
import { useDemo } from '../state/useDemo'

const METHOD_LABELS: Record<PayoutMethod, string> = {
  bank: 'Bank account',
  paypal: 'PayPal',
  crypto: 'External wallet',
}

export function WithdrawPreviewScreen() {
  const {
    iCoins,
    aCoins,
    walletBackend,
    appMode,
    setScreen,
    applyIcoinBalance,
    prependTransactions,
  } = useDemo()

  const demo = walletBackend !== 'live'
  const minAmt = demo ? MIN_PAYOUT_ICOIN_DEMO : MIN_PAYOUT_ICOIN
  const icMax = Math.max(minAmt, iCoins)
  const [amt, setAmt] = useState(() => Math.min(icMax, Math.max(minAmt, 200)))
  const [method, setMethod] = useState<PayoutMethod>('bank')
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
  const [phase, setPhase] = useState<'form' | 'clearing' | 'done'>('form')
  const [error, setError] = useState<string | null>(null)
  const [lastNetUsd, setLastNetUsd] = useState(0)
  const stripeReadiness = getStripeReadiness()

  const payout = usePayout({
    coinType: 'icoin',
    balances: { icoin: iCoins, vicoin: aCoins },
    walletBackend,
  })

  useEffect(() => {
    void payout.loadPaymentMethods()
    void payout.loadPayoutHistory()
  }, [payout.loadPaymentMethods, payout.loadPayoutHistory])

  useEffect(() => {
    const def = payout.paymentMethods.find((m) => m.is_default) ?? payout.paymentMethods[0]
    if (def) {
      setPaymentMethodId(def.id)
      if (def.method_type === 'paypal' || def.method_type === 'bank' || def.method_type === 'crypto') {
        setMethod(def.method_type)
      }
    }
  }, [payout.paymentMethods])

  const { fee, netAmount } = useMemo(() => getPayoutFee(amt), [amt])
  const validation = validatePayoutAmount(amt, 'icoin', iCoins, demo)
  const usdReceive = netAmount * 0.01

  async function runWithdraw() {
    setError(null)
    if (!validation.valid) {
      setError(validation.hint ?? 'Invalid amount')
      return
    }
    setPhase('clearing')

    const result = await payout.submitPayout({
      amount: amt,
      method,
      paymentMethodId,
    })

    if (!result.success) {
      setPhase('form')
      setError(result.error)
      return
    }

    if (typeof result.new_balance === 'number') {
      applyIcoinBalance(result.new_balance)
    } else if (demo) {
      applyIcoinBalance(iCoins - amt)
    }

    setLastNetUsd((result.net_amount ?? netAmount) * 0.01)
    prependTransactions([
      {
        id: `tx-withdraw-${result.payout_request_id ?? Date.now()}`,
        source: `Withdraw · ${METHOD_LABELS[method]}`,
        timeLabel: 'Just now',
        amountDisplay: `−${amt.toLocaleString()} ${formatCoinLabel('icoin')}`,
        kind: 'negative',
      },
    ])
    setPhase('done')
    void payout.loadPayoutHistory()
  }

  if (phase === 'clearing' || phase === 'done') {
    return (
      <PhoneFrame scroll>
        <BackRow
          label="Withdraw"
          onBack={() => (phase === 'done' ? setScreen('immersive-feed') : setPhase('form'))}
        />
        <h1 className="screen-title">{phase === 'done' ? 'Payout requested' : 'Processing…'}</h1>
        <p className="screen-sub mono">
          {phase === 'done'
            ? `~$${lastNetUsd.toFixed(2)} USD after fee · ${ESTIMATED_ARRIVAL[method]}`
            : 'Server-authoritative payout · pending settlement'}
        </p>
        {phase === 'done' && (
          <Button className="prot-cta" onClick={() => setScreen('immersive-feed')}>
            Back to feed
          </Button>
        )}
        {appMode === 'presenter' ? (
          <SourceEvidence
            paths={[
              '04_wallet_payments/iapp_withdraw_screen (1).html',
              'app/supabase/functions/request-payout',
            ]}
          />
        ) : null}
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame scroll>
      <BackRow label="Wallet" onBack={() => setScreen('immersive-feed')} />
      <h1 className="screen-title">Withdraw</h1>
      <p className="screen-sub">
        Move {formatCoinLabel('icoin')} to payout destination · 2% fee (min 10, max 500 coins).
      </p>
      <p className="profile-trust-card__hint mono" style={{ marginBottom: 12 }}>
        {stripeReadinessLabel(stripeReadiness)}
      </p>
      <input
        className="withdraw-big-input mono"
        type="number"
        value={amt}
        min={minAmt}
        max={icMax}
        onChange={(e) => setAmt(Math.min(icMax, Math.max(minAmt, Number(e.target.value) || 0)))}
      />
      <div className="pct-row-prot">
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            type="button"
            className="pct-btn-prot"
            onClick={() => setAmt(Math.floor((icMax * p) / 100))}
          >
            {p === 100 ? 'Max' : `${p}%`}
          </button>
        ))}
      </div>

      {payout.paymentMethods.map((pm) => {
        const m =
          pm.method_type === 'paypal' || pm.method_type === 'bank' || pm.method_type === 'crypto'
            ? (pm.method_type as PayoutMethod)
            : 'bank'
        const selected = paymentMethodId === pm.id
        return (
          <button
            key={pm.id}
            type="button"
            className={`dest-row-prot ${selected ? 'on' : ''}`}
            onClick={() => {
              setPaymentMethodId(pm.id)
              setMethod(m)
            }}
          >
            <span className="dest-name-prot">{pm.nickname ?? METHOD_LABELS[m]}</span>
            <span className={`dest-radio-prot ${selected ? 'sel' : ''}`} aria-hidden />
          </button>
        )
      })}

      <div className="breakdown-withdraw prot">
        <div className="bk-row-withdraw">
          <span>You send</span>
          <span className="mono">
            {amt.toLocaleString()} {formatCoinLabel('icoin')}
          </span>
        </div>
        <div className="bk-row-withdraw">
          <span>Arrival</span>
          <span className="mono">{ESTIMATED_ARRIVAL[method]}</span>
        </div>
        <div className="bk-row-withdraw">
          <span>Fee</span>
          <span className="mono">
            −{fee} {formatCoinLabel('icoin')}
          </span>
        </div>
        <div className="bk-row-withdraw total">
          <span>You receive</span>
          <span className="mono">${usdReceive.toFixed(2)} USD</span>
        </div>
      </div>

      {walletBackend === 'live' && payout.payoutHistory.length > 0 ? (
        <div className="immersive-glass-sheet__section" style={{ marginTop: 16 }}>
          <span className="immersive-glass-sheet__label">Recent payouts</span>
          <ul className="immersive-glass-sheet__tx-list">
            {payout.payoutHistory.slice(0, 3).map((row) => (
              <li key={row.id} className="immersive-glass-sheet__tx immersive-glass-sheet__tx--pending">
                <span className="immersive-glass-sheet__tx-body">
                  <span className="immersive-glass-sheet__tx-source mono">
                    {row.amount.toLocaleString()} {row.coin_type} · {row.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="screen-sub" style={{ color: '#f87171' }}>
          {error}
        </p>
      ) : null}

      <Button
        disabled={!validation.valid || payout.submitting}
        onClick={() => void runWithdraw()}
      >
        {payout.submitting ? 'Requesting…' : 'Confirm withdraw'}
      </Button>
      <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setScreen('immersive-feed')}>
        Cancel
      </Button>

      {appMode === 'presenter' ? (
        <SourceEvidence
          paths={[
            '04_wallet_payments/iapp_withdraw_screen (1).html',
            'eye-earn-sparkle-archive/src/services/payout.service.ts',
            'app/supabase/functions/request-payout',
          ]}
        />
      ) : null}
    </PhoneFrame>
  )
}
