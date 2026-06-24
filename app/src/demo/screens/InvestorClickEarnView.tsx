import { useCallback, useRef, type PointerEvent, type CSSProperties } from 'react'
import {
  CLICK_EARN_MAX,
  CLICK_EARN_MIN,
  DEFAULT_TIP_CREATOR,
  clampClickEarnAmount,
} from '../investorDemoData'
import { tipSpendableBalance, useInvestorDemo } from '../useInvestorDemoState'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestorClickEarnView() {
  const {
    state,
    goView,
    setPresenterStep,
    tapClickEarnLike,
    startClickEarnHold,
    updateClickEarnAmount,
    releaseClickEarn,
    confirmClickEarn,
    cancelClickEarn,
    resetClickEarn,
  } = useInvestorDemo()

  const {
    usableBalance,
    walletBalance,
    clickEarnMode,
    clickEarnAmount,
    clickEarnHolding,
    clickEarnMeter,
    clickEarnMessage,
  } = state

  const creator = DEFAULT_TIP_CREATOR
  const spendable = tipSpendableBalance(usableBalance, walletBalance)

  const holdStartY = useRef(0)
  const holdStartTime = useRef(0)
  const pointerDownRef = useRef(false)

  const handleBack = () => {
    resetClickEarn()
    setPresenterStep(1)
    goView('feed')
  }

  const bumpFromPointer = useCallback(
    (clientY: number) => {
      const dragUp = Math.max(0, holdStartY.current - clientY)
      const amount = clampClickEarnAmount(CLICK_EARN_MIN + dragUp * 0.008)
      const meter = Math.min(100, 12 + dragUp * 0.55)
      updateClickEarnAmount(amount, meter)
    },
    [updateClickEarnAmount],
  )

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerDownRef.current = true
    holdStartY.current = e.clientY
    holdStartTime.current = Date.now()
    startClickEarnHold()
  }

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!pointerDownRef.current) return
    bumpFromPointer(e.clientY)
  }

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!pointerDownRef.current) return
    pointerDownRef.current = false

    const elapsed = Date.now() - holdStartTime.current
    if (elapsed < 220 && Math.abs(holdStartY.current - e.clientY) < 12) {
      tapClickEarnLike()
      return
    }

    releaseClickEarn()
  }

  const hearts = Array.from({ length: 5 }, (_, i) => i)

  return (
    <div className="id-clickearn">
      <div className="id-clickearn__scroll">
        <button type="button" className="id-clickearn__back" onClick={handleBack}>
          <span className="id-clickearn__back-icon" aria-hidden>←</span>
          Feed
        </button>

        <header className="id-clickearn__header">
          <h1 className="id-clickearn__title">Click-and-Earn</h1>
          <p className="id-clickearn__sub">Hold-to-value creator interaction</p>
        </header>

        <div className="id-clickearn__preview-card">
          <div className="id-clickearn__preview-media" aria-hidden>▶</div>
          <p className="id-clickearn__preview-caption">Creator spotlight · demo clip</p>
        </div>

        <div className="id-clickearn__creator">
          <div
            className="id-clickearn__creator-avatar"
            style={{ background: `${creator.color}22`, color: creator.color }}
            aria-hidden
          >
            {creator.initials}
          </div>
          <div>
            <p className="id-clickearn__creator-name">{creator.name}</p>
            <p className="id-clickearn__creator-handle">{creator.handle}</p>
          </div>
        </div>

        <div className="id-clickearn__stage">
          <div className="id-clickearn__meter">
            <div className="id-clickearn__meter-track">
              <div
                className="id-clickearn__meter-fill"
                style={{ height: `${clickEarnMeter}%` }}
              />
            </div>
            <span className="id-clickearn__meter-label">Value meter</span>
          </div>

          <div className="id-clickearn__button-wrap">
            {hearts.map((i) => (
              <span
                key={i}
                className={`id-clickearn__particle${clickEarnHolding ? ' active' : ''}`}
                style={{ '--i': i } as CSSProperties}
                aria-hidden
              >
                ♥
              </span>
            ))}
            <button
              type="button"
              className={`id-clickearn__love-btn${
                clickEarnHolding ? ' holding' : ''
              }${clickEarnMode === 'liked' ? ' liked' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              disabled={clickEarnMode === 'confirmed' || clickEarnMode === 'preview'}
            >
              ♥
            </button>
          </div>
        </div>

        {clickEarnMessage ? (
          <p className="id-clickearn__message">{clickEarnMessage}</p>
        ) : null}

        {clickEarnMode === 'preview' ? (
          <section className="id-clickearn__offer">
            <p className="id-clickearn__offer-title">Value preview</p>
            <p className="id-clickearn__offer-amount mono">{fmt(clickEarnAmount)} iC</p>
            <p className="id-clickearn__offer-sub">
              Simulated hold-to-value offer for {creator.handle}
            </p>
            <p className="id-clickearn__offer-bal">
              Spendable preview: {fmt(spendable)} iC
            </p>
            <div className="id-clickearn__offer-actions">
              <button
                type="button"
                className="id-clickearn__btn id-clickearn__btn--primary"
                onClick={confirmClickEarn}
                disabled={clickEarnAmount > spendable}
              >
                Confirm preview
              </button>
              <button type="button" className="id-clickearn__btn" onClick={cancelClickEarn}>
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        {clickEarnMode === 'confirmed' ? (
          <section className="id-clickearn__offer confirmed">
            <p className="id-clickearn__offer-title">Creator value action · preview</p>
            <p className="id-clickearn__offer-amount mono">−{fmt(clickEarnAmount)} iC</p>
            <p className="id-clickearn__offer-sub">
              Wallet impact preview recorded · simulated only
            </p>
            <button type="button" className="id-clickearn__btn id-clickearn__btn--primary" onClick={handleBack}>
              Back to Feed
            </button>
          </section>
        ) : null}

        <section className="id-clickearn__hint">
          <p>Tap once → liked · no value moved</p>
          <p>Press & hold → drag up to raise amount · release for preview</p>
          <p className="id-clickearn__range">
            Range {CLICK_EARN_MIN.toFixed(2)}–{CLICK_EARN_MAX.toFixed(2)} iC · simulated
          </p>
        </section>

        <p className="id-clickearn__disclaimer">
          Simulated creator value action. No real financial movement.
        </p>
      </div>
    </div>
  )
}
