import { useEffect, useMemo, useState } from 'react'
import {
  CONVERT_FEE_RATE,
  CONVERT_RATE,
  CONVERT_TRUST_MULTIPLIER,
  CONVERT_TRUST_TIER,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

type Preset = 25 | 50 | 75 | 100 | null

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestorConvertView() {
  const { state, goView, confirmConvert } = useInvestorDemo()
  const { walletBalance, usableBalance, convertConfirmed, lastConvertAmount } = state

  const [amountStr, setAmountStr] = useState('')
  const [activePreset, setActivePreset] = useState<Preset>(null)
  const [submitting, setSubmitting] = useState(false)

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amountStr)
    return Number.isFinite(n) ? n : 0
  }, [amountStr])

  const fee = +(parsedAmount * CONVERT_FEE_RATE).toFixed(2)
  const received = +((parsedAmount - fee) * CONVERT_RATE * CONVERT_TRUST_MULTIPLIER).toFixed(2)
  const isOverBalance = parsedAmount > walletBalance
  const isValid = parsedAmount > 0 && !isOverBalance && !convertConfirmed

  useEffect(() => {
    if (convertConfirmed) setSubmitting(false)
  }, [convertConfirmed])

  const applyPreset = (pct: Preset) => {
    if (pct === null) return
    const amt = +((walletBalance * pct) / 100).toFixed(2)
    setAmountStr(amt > 0 ? amt.toFixed(2) : '')
    setActivePreset(pct)
  }

  const handleAmountChange = (value: string) => {
    setAmountStr(value)
    setActivePreset(null)
  }

  const handleConfirm = () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    confirmConvert(parsedAmount)
  }

  const handleBack = () => {
    goView('wallet')
  }

  if (convertConfirmed) {
    return (
      <div className="id-convert">
        <button type="button" className="id-convert__back" onClick={handleBack}>
          <span className="id-convert__back-icon" aria-hidden>←</span>
          Wallet
        </button>

        <div className="id-convert__confirm-card">
          <div className="id-convert__confirm-icon" aria-hidden>✓</div>
          <p className="id-convert__confirm-title">Conversion complete</p>
          <p className="id-convert__confirm-amount">
            {fmt(lastConvertAmount)} <span>iC</span>
          </p>
          <p className="id-convert__confirm-sub">
            Moved to usable balance · simulated
          </p>
          <div className="id-convert__confirm-rows">
            <div className="id-convert__confirm-row">
              <span>Verified iCoins</span>
              <span className="mono">{fmt(walletBalance)} iC</span>
            </div>
            <div className="id-convert__confirm-row">
              <span>Usable balance</span>
              <span className="mono ic-accent">{fmt(usableBalance)} iC</span>
            </div>
          </div>
          <button type="button" className="id-convert__cta" onClick={handleBack}>
            Back to Wallet
          </button>
        </div>

        <p className="id-convert__disclaimer">
          Simulated conversion. No real financial movement.
        </p>
      </div>
    )
  }

  return (
    <div className="id-convert">
      <button type="button" className="id-convert__back" onClick={handleBack}>
        <span className="id-convert__back-icon" aria-hidden>←</span>
        Wallet
      </button>

      <h1 className="id-convert__title">Convert</h1>
      <p className="id-convert__sub">
        Trust tier: <strong>{CONVERT_TRUST_TIER}</strong> · demo rate 1:1
      </p>

      {/* FROM card */}
      <div className="id-convert__card">
        <p className="id-convert__card-label">From</p>
        <div className="id-convert__coin-row">
          <div className="id-convert__coin id-convert__coin--verified" aria-hidden>i</div>
          <div className="id-convert__coin-info">
            <p className="id-convert__coin-name">Verified iCoins</p>
            <p className="id-convert__coin-bal mono">{fmt(walletBalance)} available</p>
          </div>
        </div>

        <div className="id-convert__amount-row">
          <input
            className="id-convert__amount-input mono"
            type="number"
            inputMode="decimal"
            min={0}
            max={walletBalance}
            step="0.01"
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => handleAmountChange(e.target.value)}
            aria-label="Amount to convert"
          />
          <span className="id-convert__amount-sym">iCoins</span>
        </div>

        {isOverBalance ? (
          <p className="id-convert__error">Exceeds available balance</p>
        ) : null}

        <div className="id-convert__presets">
          {([25, 50, 75, 100] as const).map((pct) => (
            <button
              key={pct}
              type="button"
              className={`id-convert__preset${activePreset === pct ? ' active' : ''}`}
              onClick={() => applyPreset(pct)}
            >
              {pct === 100 ? 'Max' : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

      <div className="id-convert__swap" aria-hidden>⇅</div>

      {/* TO card / preview */}
      <div className="id-convert__card">
        <p className="id-convert__card-label">To</p>
        <div className="id-convert__coin-row">
          <div className="id-convert__coin id-convert__coin--usable" aria-hidden>◎</div>
          <div className="id-convert__coin-info">
            <p className="id-convert__coin-name">Usable balance</p>
            <p className="id-convert__coin-bal mono ic-accent">
              {parsedAmount > 0 ? `+${fmt(received)} receiving` : '— receiving'}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="id-convert__breakdown">
        <div className="id-convert__bk-row">
          <span>You send</span>
          <span className="mono">{fmt(parsedAmount)} iCoins</span>
        </div>
        <div className="id-convert__bk-row">
          <span>Conversion rate</span>
          <span className="mono">1:1</span>
        </div>
        <div className="id-convert__bk-row">
          <span>Pool fee (demo)</span>
          <span className="mono">{fmt(fee)} iCoins</span>
        </div>
        <div className="id-convert__bk-row id-convert__bk-row--total">
          <span>You receive</span>
          <span className="mono ic-accent">{fmt(received)} usable</span>
        </div>
      </div>

      <div className="id-convert__trust">
        <span className="id-convert__trust-dot" aria-hidden />
        <span>
          {CONVERT_TRUST_TIER} · verified demo session · no external rails
        </span>
      </div>

      <button
        type="button"
        className="id-convert__cta"
        onClick={handleConfirm}
        disabled={!isValid || submitting}
      >
        {submitting ? 'Converting…' : 'Confirm conversion'}
      </button>

      <p className="id-convert__disclaimer">
        Simulated conversion. No real financial movement.
      </p>
    </div>
  )
}
