import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PAY_MERCHANT,
  PAY_MODE_OPTIONS,
  PAY_PRESETS,
  payModeLabel,
} from '../investorDemoData'
import { tipSpendableBalance, useInvestorDemo } from '../useInvestorDemoState'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestorPayView() {
  const {
    state,
    goView,
    setPayAmount,
    setPayMode,
    confirmPay,
  } = useInvestorDemo()

  const {
    usableBalance,
    walletBalance,
    payAmount,
    payMode,
    payConfirmed,
    lastPayAmount,
  } = state

  const [amountStr, setAmountStr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const merchant = DEFAULT_PAY_MERCHANT
  const spendable = tipSpendableBalance(usableBalance, walletBalance)

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amountStr)
    return Number.isFinite(n) ? n : 0
  }, [amountStr])

  const isOverBalance = parsedAmount > spendable
  const isValid = parsedAmount > 0 && !isOverBalance && !payConfirmed

  useEffect(() => {
    if (payConfirmed) setSubmitting(false)
  }, [payConfirmed])

  const handleAmountChange = (value: string) => {
    setAmountStr(value)
    const n = parseFloat(value)
    setPayAmount(Number.isFinite(n) ? n : 0)
  }

  const applyPreset = (amt: number) => {
    setAmountStr(amt.toFixed(2))
    setPayAmount(amt)
  }

  const handleConfirm = () => {
    if (!isValid || submitting || payAmount <= 0) return
    setSubmitting(true)
    confirmPay()
  }

  const handleBack = () => goView('wallet')

  if (payConfirmed) {
    return (
      <div className="id-pay">
        <button type="button" className="id-pay__back" onClick={handleBack}>
          <span className="id-pay__back-icon" aria-hidden>←</span>
          Wallet
        </button>

        <div className="id-pay__confirm-card">
          <div className="id-pay__confirm-icon" aria-hidden>✓</div>
          <p className="id-pay__confirm-title">Payment preview complete</p>
          <p className="id-pay__confirm-amount">
            {fmt(lastPayAmount)} <span>iC</span>
          </p>
          <p className="id-pay__confirm-sub">
            {merchant.name} · {payModeLabel(payMode)} · simulated
          </p>
          <div className="id-pay__confirm-rows">
            <div className="id-pay__confirm-row">
              <span>Usable balance</span>
              <span className="mono">{fmt(usableBalance)} iC</span>
            </div>
            <div className="id-pay__confirm-row">
              <span>Verified balance</span>
              <span className="mono">{fmt(walletBalance)} iC</span>
            </div>
          </div>
          <button type="button" className="id-pay__cta" onClick={handleBack}>
            Back to Wallet
          </button>
        </div>

        <p className="id-pay__disclaimer">
          Simulated payment. No real financial movement.
        </p>
      </div>
    )
  }

  return (
    <div className="id-pay">
      <button type="button" className="id-pay__back" onClick={handleBack}>
        <span className="id-pay__back-icon" aria-hidden>←</span>
        Wallet
      </button>

      <h1 className="id-pay__title">Pay</h1>
      <p className="id-pay__sub">Simulated wallet payment</p>

      <div className="id-pay__balance-card">
        <p className="id-pay__balance-label">Available to spend</p>
        <p className="id-pay__balance-num mono">
          {fmt(spendable)} <span>iC</span>
        </p>
        <p className="id-pay__balance-sub">
          Usable {fmt(usableBalance)} · Verified {fmt(walletBalance)}
        </p>
      </div>

      <p className="id-pay__sec-label">Payment mode</p>
      <div className="id-pay__mode-row">
        {PAY_MODE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`id-pay__mode${payMode === opt.id ? ' active' : ''}`}
            onClick={() => setPayMode(opt.id)}
          >
            <span className="id-pay__mode-icon" aria-hidden>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      <div className="id-pay__merchant">
        <div
          className="id-pay__merchant-icon"
          style={{ background: `${merchant.color}20`, color: merchant.color }}
          aria-hidden
        >
          {merchant.initials}
        </div>
        <div className="id-pay__merchant-info">
          <p className="id-pay__merchant-name">{merchant.name}</p>
          <p className="id-pay__merchant-sub">{merchant.subtitle}</p>
        </div>
      </div>

      <p className="id-pay__sec-label">Amount</p>
      <div className="id-pay__presets">
        {PAY_PRESETS.map((amt) => (
          <button
            key={amt}
            type="button"
            className={`id-pay__preset${parsedAmount === amt ? ' active' : ''}`}
            onClick={() => applyPreset(amt)}
            disabled={amt > spendable}
          >
            <span className="id-pay__preset-amt mono">{amt.toFixed(2)}</span>
            <span className="id-pay__preset-coin">iC</span>
          </button>
        ))}
      </div>

      <div className="id-pay__custom-row">
        <input
          className="id-pay__custom-input mono"
          type="number"
          inputMode="decimal"
          min={0}
          max={spendable}
          step="0.01"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => handleAmountChange(e.target.value)}
          aria-label="Payment amount"
        />
        <span className="id-pay__custom-sym">iC</span>
      </div>

      {isOverBalance ? (
        <p className="id-pay__error">Exceeds available balance</p>
      ) : null}

      <div className="id-pay__preview">
        <div className="id-pay__preview-row">
          <span>Merchant</span>
          <span>{merchant.name}</span>
        </div>
        <div className="id-pay__preview-row">
          <span>Mode</span>
          <span>{payModeLabel(payMode)}</span>
        </div>
        <div className="id-pay__preview-row id-pay__preview-row--total">
          <span>Total</span>
          <span className="mono ic-accent">{fmt(parsedAmount)} iC</span>
        </div>
      </div>

      <button
        type="button"
        className="id-pay__cta id-pay__cta--primary"
        onClick={handleConfirm}
        disabled={!isValid || submitting}
      >
        {submitting ? 'Processing…' : 'Confirm simulated payment'}
      </button>

      <p className="id-pay__disclaimer">
        Simulated payment. No real financial movement.
      </p>
    </div>
  )
}
