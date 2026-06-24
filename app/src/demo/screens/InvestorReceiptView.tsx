import { useMemo } from 'react'
import {
  buildReceiptDetail,
  findReceiptTransaction,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorReceiptView() {
  const {
    state,
    returnFromReceipt,
    setPresenterStep,
    goView,
    openACoins,
    openMoneyMap,
    openPOPLive,
  } = useInvestorDemo()

  const { transactions, selectedReceiptId } = state

  const tx = useMemo(
    () => findReceiptTransaction(transactions, selectedReceiptId),
    [transactions, selectedReceiptId],
  )

  const receipt = useMemo(
    () => (tx ? buildReceiptDetail(tx) : null),
    [tx],
  )

  const handleBack = () => returnFromReceipt()

  const openWallet = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  const openPop = () => {
    setPresenterStep(3)
    openPOPLive()
  }

  if (!receipt) {
    return (
      <div className="id-receipt">
        <div className="id-receipt__scroll">
          <button type="button" className="id-receipt__back" onClick={handleBack}>
            <span className="id-receipt__back-icon" aria-hidden>←</span>
            Back
          </button>
          <p className="id-receipt__empty">Receipt not found · simulated preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="id-receipt">
      <div className="id-receipt__scroll">
        <button type="button" className="id-receipt__back" onClick={handleBack}>
          <span className="id-receipt__back-icon" aria-hidden>←</span>
          Wallet
        </button>

        <header className="id-receipt__header">
          <div className="id-receipt__mark" aria-hidden>✓</div>
          <div>
            <h1 className="id-receipt__title">Receipt</h1>
            <p className="id-receipt__sub">Simulated transaction confirmation</p>
          </div>
        </header>

        <span className={`id-receipt__status id-receipt__status--${receipt.statusTone}`}>
          {receipt.statusBadge}
        </span>

        <section className="id-receipt__card">
          <p className="id-receipt__type">{receipt.typeLabel}</p>
          <p className="id-receipt__amount mono">{receipt.amount}</p>
          <p className="id-receipt__direction">
            {receipt.direction === 'credit'
              ? 'Credit · internal value'
              : receipt.direction === 'debit'
                ? 'Debit · wallet routing preview'
                : 'Routed · internal value layer'}
          </p>

          <div className="id-receipt__rows">
            <div className="id-receipt__row">
              <span className="id-receipt__key">Source</span>
              <span className="id-receipt__val">{receipt.source}</span>
            </div>
            <div className="id-receipt__row">
              <span className="id-receipt__key">Destination</span>
              <span className="id-receipt__val">{receipt.destination}</span>
            </div>
            <div className="id-receipt__row">
              <span className="id-receipt__key">Status</span>
              <span className="id-receipt__val">{receipt.statusBadge}</span>
            </div>
            <div className="id-receipt__row">
              <span className="id-receipt__key">Timestamp</span>
              <span className="id-receipt__val">{receipt.timestamp}</span>
            </div>
            <div className="id-receipt__row">
              <span className="id-receipt__key">Transaction ID</span>
              <span className="id-receipt__val mono">{receipt.simulatedTxId}</span>
            </div>
            {receipt.popReview ? (
              <div className="id-receipt__row">
                <span className="id-receipt__key">POP / review</span>
                <span className="id-receipt__val">{receipt.popReview}</span>
              </div>
            ) : null}
            {receipt.feePreview ? (
              <div className="id-receipt__row">
                <span className="id-receipt__key">Fee preview</span>
                <span className="id-receipt__val">{receipt.feePreview}</span>
              </div>
            ) : null}
          </div>
        </section>

        <section className="id-receipt__panel">
          <p className="id-receipt__panel-title">Receipt timeline · preview</p>
          <div className="id-receipt__timeline">
            {receipt.timeline.map((step) => (
              <div key={step.id} className={`id-receipt__step ${step.status}`}>
                <span className="id-receipt__step-dot" aria-hidden />
                <div className="id-receipt__step-text">
                  <span className="id-receipt__step-label">{step.label}</span>
                  <span className="id-receipt__step-sub">{step.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="id-receipt__routes">
          <p className="id-receipt__panel-title">Related previews</p>
          <div className="id-receipt__route-row">
            <button type="button" className="id-receipt__route-btn" onClick={openWallet}>
              Wallet
            </button>
            <button type="button" className="id-receipt__route-btn" onClick={openMoneyMap}>
              Money Map
            </button>
          </div>
          <div className="id-receipt__route-row">
            <button type="button" className="id-receipt__route-btn" onClick={openACoins}>
              ACoins
            </button>
            {receipt.showPopRoute ? (
              <button type="button" className="id-receipt__route-btn" onClick={openPop}>
                POP Live
              </button>
            ) : (
              <span className="id-receipt__route-spacer" />
            )}
          </div>
        </section>

        <p className="id-receipt__disclaimer">
          Simulated receipt. No real financial movement, settlement, or external account access.
        </p>
      </div>
    </div>
  )
}
