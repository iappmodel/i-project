import { useEffect, useMemo, useState } from 'react'
import {
  WITHDRAW_METHOD_OPTIONS,
  WITHDRAW_PRESETS,
  withdrawFee,
  withdrawMethodLabel,
} from '../investorDemoData'
import { tipSpendableBalance, useInvestorDemo } from '../useInvestorDemoState'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestorWithdrawView() {
  const {
    state,
    goView,
    setWithdrawAmount,
    setWithdrawMethod,
    confirmWithdraw,
  } = useInvestorDemo()

  const {
    usableBalance,
    walletBalance,
    withdrawAmount,
    withdrawMethod,
    withdrawConfirmed,
    lastWithdrawAmount,
    lastWithdrawFee,
  } = state

  const [amountStr, setAmountStr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const spendable = tipSpendableBalance(usableBalance, walletBalance)
  const fee = withdrawFee(withdrawMethod)

  const parsedAmount = useMemo(() => {
    const n = parseFloat(amountStr)
    return Number.isFinite(n) ? n : 0
  }, [amountStr])

  const totalDebit = +(parsedAmount + fee).toFixed(2)
  const isOverBalance = totalDebit > spendable
  const isValid = parsedAmount > 0 && !isOverBalance && !withdrawConfirmed

  useEffect(() => {
    if (withdrawConfirmed) setSubmitting(false)
  }, [withdrawConfirmed])

  const handleAmountChange = (value: string) => {
    setAmountStr(value)
    const n = parseFloat(value)
    setWithdrawAmount(Number.isFinite(n) ? n : 0)
  }

  const applyPreset = (amt: number) => {
    setAmountStr(amt.toFixed(2))
    setWithdrawAmount(amt)
  }

  const handleConfirm = () => {
    if (!isValid || submitting || withdrawAmount <= 0) return
    setSubmitting(true)
    confirmWithdraw()
  }

  const handleBack = () => goView('wallet')

  if (withdrawConfirmed) {
    const totalCharged = +(lastWithdrawAmount + lastWithdrawFee).toFixed(2)
    return (
      <div className="id-withdraw">
        <button type="button" className="id-withdraw__back" onClick={handleBack}>
          <span className="id-withdraw__back-icon" aria-hidden>←</span>
          Wallet
        </button>

        <div className="id-withdraw__confirm-card">
          <div className="id-withdraw__confirm-icon" aria-hidden>↓</div>
          <p className="id-withdraw__confirm-title">Withdrawal preview queued</p>
          <p className="id-withdraw__confirm-amount">
            {fmt(lastWithdrawAmount)} <span>iC</span>
          </p>
          <p className="id-withdraw__confirm-sub">
            {withdrawMethodLabel(withdrawMethod)} · demo destination · simulated
          </p>
          {lastWithdrawFee > 0 ? (
            <p className="id-withdraw__confirm-fee">
              Fee {fmt(lastWithdrawFee)} iC · total {fmt(totalCharged)} iC
            </p>
          ) : null}
          <div className="id-withdraw__confirm-rows">
            <div className="id-withdraw__confirm-row">
              <span>Usable balance</span>
              <span className="mono">{fmt(usableBalance)} iC</span>
            </div>
            <div className="id-withdraw__confirm-row">
              <span>Verified balance</span>
              <span className="mono">{fmt(walletBalance)} iC</span>
            </div>
          </div>
          <button type="button" className="id-withdraw__cta" onClick={handleBack}>
            Back to Wallet
          </button>
        </div>

        <p className="id-withdraw__disclaimer">
          Simulated withdrawal preview. No real destination connected.
        </p>
      </div>
    )
  }

  return (
    <div className="id-withdraw">
      <button type="button" className="id-withdraw__back" onClick={handleBack}>
        <span className="id-withdraw__back-icon" aria-hidden>←</span>
        Wallet
      </button>

      <h1 className="id-withdraw__title">Withdraw</h1>
      <p className="id-withdraw__sub">Simulated withdrawal preview</p>

      <div className="id-withdraw__balance-card">
        <p className="id-withdraw__balance-label">Available to withdraw</p>
        <p className="id-withdraw__balance-num mono">
          {fmt(spendable)} <span>iC</span>
        </p>
        <p className="id-withdraw__balance-sub">
          Usable {fmt(usableBalance)} · Verified {fmt(walletBalance)}
        </p>
      </div>

      <p className="id-withdraw__sec-label">Method</p>
      <div className="id-withdraw__method-list">
        {WITHDRAW_METHOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`id-withdraw__method${withdrawMethod === opt.id ? ' active' : ''}`}
            onClick={() => setWithdrawMethod(opt.id)}
          >
            <span className="id-withdraw__method-label">{opt.label}</span>
            <span className="id-withdraw__method-sub">{opt.sublabel}</span>
          </button>
        ))}
      </div>

      <div className="id-withdraw__destination">
        <p className="id-withdraw__destination-label">Destination preview</p>
        <p className="id-withdraw__destination-name">Demo destination</p>
        <p className="id-withdraw__destination-sub">No real account connected</p>
      </div>

      <p className="id-withdraw__sec-label">Amount</p>
      <div className="id-withdraw__presets">
        {WITHDRAW_PRESETS.map((amt) => (
          <button
            key={amt}
            type="button"
            className={`id-withdraw__preset${parsedAmount === amt ? ' active' : ''}`}
            onClick={() => applyPreset(amt)}
            disabled={amt + fee > spendable}
          >
            <span className="id-withdraw__preset-amt mono">{amt.toFixed(2)}</span>
            <span className="id-withdraw__preset-coin">iC</span>
          </button>
        ))}
      </div>

      <div className="id-withdraw__custom-row">
        <input
          className="id-withdraw__custom-input mono"
          type="number"
          inputMode="decimal"
          min={0}
          max={Math.max(0, spendable - fee)}
          step="0.01"
          placeholder="0.00"
          value={amountStr}
          onChange={(e) => handleAmountChange(e.target.value)}
          aria-label="Withdrawal amount"
        />
        <span className="id-withdraw__custom-sym">iC</span>
      </div>

      {isOverBalance ? (
        <p className="id-withdraw__error">Exceeds available balance (incl. fee)</p>
      ) : null}

      <div className="id-withdraw__preview">
        <div className="id-withdraw__preview-row">
          <span>Method</span>
          <span>{withdrawMethodLabel(withdrawMethod)}</span>
        </div>
        <div className="id-withdraw__preview-row">
          <span>Simulated fee</span>
          <span className="mono">{fmt(fee)} iC</span>
        </div>
        <div className="id-withdraw__preview-row id-withdraw__preview-row--total">
          <span>Total debit</span>
          <span className="mono ic-accent">{fmt(totalDebit)} iC</span>
        </div>
      </div>

      <button
        type="button"
        className="id-withdraw__cta id-withdraw__cta--primary"
        onClick={handleConfirm}
        disabled={!isValid || submitting}
      >
        {submitting ? 'Processing…' : 'Confirm withdrawal preview'}
      </button>

      <p className="id-withdraw__disclaimer">
        Simulated withdrawal preview. No real destination connected.
      </p>
    </div>
  )
}
