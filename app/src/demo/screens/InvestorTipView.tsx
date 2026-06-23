import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_TIP_CREATOR,
  TIP_FEE_RATE,
  TIP_PRESETS,
} from '../investorDemoData'
import { tipSpendableBalance, useInvestorDemo } from '../useInvestorDemoState'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestorTipView() {
  const { state, goView, confirmTip } = useInvestorDemo()
  const {
    usableBalance,
    walletBalance,
    tipConfirmed,
    lastTipAmount,
    lastTipMessage,
  } = state

  const [amountStr, setAmountStr] = useState('')
  const [activePreset, setActivePreset] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const creator = DEFAULT_TIP_CREATOR
  const spendable = tipSpendableBalance(usableBalance, walletBalance)

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amountStr)
    return Number.isFinite(n) ? n : 0
  }, [amountStr])

  const fee = +(parsedAmount * TIP_FEE_RATE).toFixed(2)
  const netTip = +(parsedAmount - fee).toFixed(2)
  const isOverBalance = parsedAmount > spendable
  const isValid = parsedAmount > 0 && !isOverBalance && !tipConfirmed

  useEffect(() => {
    if (tipConfirmed) setSubmitting(false)
  }, [tipConfirmed])

  const applyPreset = (amt: number) => {
    setAmountStr(amt.toFixed(2))
    setActivePreset(amt)
  }

  const handleAmountChange = (value: string) => {
    setAmountStr(value)
    setActivePreset(null)
  }

  const handleConfirm = () => {
    if (!isValid || submitting) return
    setSubmitting(true)
    confirmTip(parsedAmount, message)
  }

  const handleBack = () => {
    goView('wallet')
  }

  if (tipConfirmed) {
    return (
      <div className="id-tip">
        <button type="button" className="id-tip__back" onClick={handleBack}>
          <span className="id-tip__back-icon" aria-hidden>←</span>
          Wallet
        </button>

        <div className="id-tip__confirm-card">
          <div className="id-tip__confirm-icon" aria-hidden>♥</div>
          <p className="id-tip__confirm-title">Tip sent</p>
          <p className="id-tip__confirm-amount">
            {fmt(lastTipAmount)} <span>iC</span>
          </p>
          <p className="id-tip__confirm-sub">
            100% to {creator.name} · simulated
          </p>
          {lastTipMessage ? (
            <p className="id-tip__confirm-msg">“{lastTipMessage}”</p>
          ) : null}
          <div className="id-tip__confirm-rows">
            <div className="id-tip__confirm-row">
              <span>Usable balance</span>
              <span className="mono">{fmt(usableBalance)} iC</span>
            </div>
            <div className="id-tip__confirm-row">
              <span>Verified balance</span>
              <span className="mono">{fmt(walletBalance)} iC</span>
            </div>
          </div>
          <button type="button" className="id-tip__cta" onClick={handleBack}>
            Back to Wallet
          </button>
        </div>

        <p className="id-tip__disclaimer">
          Simulated creator tip. No real financial movement.
        </p>
      </div>
    )
  }

  return (
    <div className="id-tip">
      <button type="button" className="id-tip__back" onClick={handleBack}>
        <span className="id-tip__back-icon" aria-hidden>←</span>
        Wallet
      </button>

      <h1 className="id-tip__title">Tip Creator</h1>
      <p className="id-tip__sub">Support creators directly · demo only</p>

      {/* Creator card */}
      <div className="id-tip__creator">
        <div
          className="id-tip__avatar"
          style={{ background: `${creator.color}20`, color: creator.color }}
          aria-hidden
        >
          {creator.initials}
        </div>
        <div className="id-tip__creator-info">
          <p className="id-tip__creator-name">{creator.name}</p>
          <p className="id-tip__creator-handle">{creator.handle}</p>
          <span className="id-tip__creator-badge">100% to creator · simulated</span>
        </div>
      </div>

      {/* Balance card */}
      <div className="id-tip__balance-card">
        <p className="id-tip__balance-label">Available to tip</p>
        <p className="id-tip__balance-num mono">
          {fmt(spendable)} <span>iC</span>
        </p>
        <p className="id-tip__balance-sub">
          Usable {fmt(usableBalance)} · Verified {fmt(walletBalance)}
        </p>
      </div>

      <p className="id-tip__sec-label">Choose amount</p>
      <div className="id-tip__presets">
        {TIP_PRESETS.map((amt) => (
          <button
            key={amt}
            type="button"
            className={`id-tip__preset${activePreset === amt ? ' active' : ''}`}
            onClick={() => applyPreset(amt)}
            disabled={amt > spendable}
          >
            <span className="id-tip__preset-amt mono">{amt.toFixed(2)}</span>
            <span className="id-tip__preset-coin">iC</span>
          </button>
        ))}
      </div>

      <div className="id-tip__custom-row">
        <input
          className="id-tip__custom-input mono"
          type="number"
          inputMode="decimal"
          min={0}
          max={spendable}
          step="0.01"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => handleAmountChange(e.target.value)}
          aria-label="Custom tip amount"
        />
        <span className="id-tip__custom-sym">iC</span>
      </div>

      {isOverBalance ? (
        <p className="id-tip__error">Exceeds available balance</p>
      ) : null}

      <p className="id-tip__sec-label">Message (optional)</p>
      <textarea
        className="id-tip__message"
        placeholder="Say thanks…"
        maxLength={120}
        rows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Optional tip message"
      />

      {/* Preview */}
      <div className="id-tip__preview">
        <div className="id-tip__preview-row">
          <span>Tip amount</span>
          <span className="mono">{fmt(parsedAmount)} iC</span>
        </div>
        <div className="id-tip__preview-row">
          <span>Platform fee (demo)</span>
          <span className="mono">{fmt(fee)} iC</span>
        </div>
        <div className="id-tip__preview-row id-tip__preview-row--total">
          <span>Creator receives</span>
          <span className="mono ic-accent">{fmt(netTip)} iC</span>
        </div>
      </div>

      <button
        type="button"
        className="id-tip__cta id-tip__cta--primary"
        onClick={handleConfirm}
        disabled={!isValid || submitting}
      >
        {submitting ? 'Sending…' : 'Send tip ♥'}
      </button>

      <p className="id-tip__disclaimer">
        Simulated creator tip. No real financial movement.
      </p>
    </div>
  )
}
