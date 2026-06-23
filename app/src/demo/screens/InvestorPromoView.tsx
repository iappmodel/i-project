import { useEffect, useState } from 'react'
import {
  getPromoOffer,
  PROMO_OFFERS,
  PROMO_VERIFICATION_CHECKS,
  promoStatusLabel,
  type PromoOffer,
  type PromoStatus,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorDock } from '../components/InvestorDock'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestorPromoView() {
  const {
    state,
    goView,
    setPresenterStep,
    selectPromo,
    startPromo,
    verifyPromo,
    claimPromoReward,
    dismissPromoClaim,
  } = useInvestorDemo()

  const {
    promoStatus,
    selectedPromoId,
    promoVerificationStep,
    promoClaimConfirmed,
    lastClaimedPromoId,
    walletBalance,
  } = state

  const [verifying, setVerifying] = useState(false)
  const [localVerifyStep, setLocalVerifyStep] = useState(0)
  const [claiming, setClaiming] = useState(false)

  const selected = selectedPromoId ? getPromoOffer(selectedPromoId) : null
  const selectedStatus = selectedPromoId ? promoStatus[selectedPromoId] : null
  const claimedOffer = lastClaimedPromoId ? getPromoOffer(lastClaimedPromoId) : null

  useEffect(() => {
    if (selectedStatus !== 'started') {
      setLocalVerifyStep(promoVerificationStep)
      setVerifying(false)
    }
  }, [selectedPromoId, selectedStatus, promoVerificationStep])

  useEffect(() => {
    if (promoClaimConfirmed) setClaiming(false)
  }, [promoClaimConfirmed])

  const handleBackToFeed = () => {
    dismissPromoClaim()
    goView('feed')
  }

  const handleBackToList = () => {
    selectPromo(null)
    setVerifying(false)
    setLocalVerifyStep(0)
  }

  const runVerification = () => {
    if (!selectedPromoId || selectedStatus !== 'started' || verifying) return
    setVerifying(true)
    setLocalVerifyStep(0)

    let step = 0
    const interval = setInterval(() => {
      step += 1
      setLocalVerifyStep(step)
      if (step >= PROMO_VERIFICATION_CHECKS.length) {
        clearInterval(interval)
        verifyPromo()
        setVerifying(false)
      }
    }, 550)
  }

  const handleClaim = () => {
    if (!selectedPromoId || selectedStatus !== 'verified' || claiming) return
    setClaiming(true)
    claimPromoReward()
  }

  if (promoClaimConfirmed && claimedOffer) {
    return (
      <div className="id-promo">
        <div className="id-promo__scroll">
          <div className="id-promo__confirm-card">
            <div className="id-promo__confirm-icon" aria-hidden>◈</div>
            <p className="id-promo__confirm-title">iGo reward claimed</p>
            <p className="id-promo__confirm-amount">
              +{fmt(claimedOffer.rewardAmount)} <span>iC</span>
            </p>
            <p className="id-promo__confirm-sub">
              {claimedOffer.merchantName} · {claimedOffer.actionType} · simulated
            </p>
            <div className="id-promo__confirm-rows">
              <div className="id-promo__confirm-row">
                <span>Verified balance</span>
                <span className="mono">{fmt(walletBalance)} iC</span>
              </div>
            </div>
            <div className="id-promo__confirm-actions">
              <button
                type="button"
                className="id-promo__cta id-promo__cta--primary"
                onClick={() => {
                  dismissPromoClaim()
                  setPresenterStep(5)
                  goView('wallet')
                }}
              >
                View Wallet
              </button>
              <button
                type="button"
                className="id-promo__cta"
                onClick={() => dismissPromoClaim()}
              >
                Back to iGo
              </button>
            </div>
          </div>
          <p className="id-promo__disclaimer">
            Simulated location reward. No GPS or merchant system connected.
          </p>
        </div>
        <InvestorDock />
      </div>
    )
  }

  if (selected && selectedPromoId) {
    return (
      <div className="id-promo">
        <div className="id-promo__scroll">
          <button type="button" className="id-promo__back" onClick={handleBackToList}>
            <span className="id-promo__back-icon" aria-hidden>←</span>
            Nearby
          </button>

          <PromoDetailCard
            offer={selected}
            status={selectedStatus ?? 'available'}
            localVerifyStep={localVerifyStep}
            verifying={verifying}
            onStart={() => startPromo(selected.id)}
            onVerify={runVerification}
            onClaim={handleClaim}
            claiming={claiming}
          />

          <p className="id-promo__disclaimer">
            Simulated location reward. No GPS or merchant system connected.
          </p>
        </div>
        <InvestorDock />
      </div>
    )
  }

  return (
    <div className="id-promo">
      <div className="id-promo__scroll">
        <button type="button" className="id-promo__back" onClick={handleBackToFeed}>
          <span className="id-promo__back-icon" aria-hidden>←</span>
          Feed
        </button>

        <h1 className="id-promo__title">iGo</h1>
        <p className="id-promo__sub">Earn from nearby actions</p>

        <div className="id-promo__location">
          <span className="id-promo__location-dot" aria-hidden />
          <div className="id-promo__location-text">
            <p className="id-promo__location-title">Near you · simulated</p>
            <p className="id-promo__location-sub">No GPS access used</p>
          </div>
          <span className="id-promo__location-badge">Demo</span>
        </div>

        <p className="id-promo__sec-label">Nearby rewards</p>
        <div className="id-promo__list">
          {PROMO_OFFERS.map((offer) => {
            const status = promoStatus[offer.id] ?? 'available'
            return (
              <PromoListCard
                key={offer.id}
                offer={offer}
                status={status}
                onSelect={() => selectPromo(offer.id)}
                onQuickStart={() => {
                  selectPromo(offer.id)
                  if (status === 'available') startPromo(offer.id)
                }}
              />
            )
          })}
        </div>

        <p className="id-promo__disclaimer">
          Simulated location reward. No GPS or merchant system connected.
        </p>
      </div>
      <InvestorDock />
    </div>
  )
}

function PromoListCard({
  offer,
  status,
  onSelect,
  onQuickStart,
}: {
  offer: PromoOffer
  status: PromoStatus
  onSelect: () => void
  onQuickStart: () => void
}) {
  const isClaimed = status === 'claimed'
  const ctaLabel =
    status === 'claimed'
      ? 'Claimed'
      : status === 'verified'
        ? 'Claim reward'
        : status === 'started'
          ? 'Continue'
          : 'View'

  return (
    <article className={`id-promo__card${isClaimed ? ' claimed' : ''}`}>
      <div
        className="id-promo__card-icon"
        style={{ background: `${offer.color}18`, color: offer.color }}
        aria-hidden
      >
        {offer.initials}
      </div>
      <div className="id-promo__card-body">
        <div className="id-promo__card-top">
          <p className="id-promo__card-name">{offer.merchantName}</p>
          <span className="id-promo__card-reward mono">+{offer.rewardAmount.toFixed(2)} iC</span>
        </div>
        <p className="id-promo__card-action">
          {offer.actionType} · {offer.distanceLabel}
        </p>
        <p className="id-promo__card-instruction">{offer.instruction}</p>
        <div className="id-promo__card-footer">
          <span className={`id-promo__status id-promo__status--${status}`}>
            {promoStatusLabel(status)}
          </span>
          <button
            type="button"
            className="id-promo__card-btn"
            onClick={status === 'available' ? onQuickStart : onSelect}
            disabled={isClaimed}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </article>
  )
}

function PromoDetailCard({
  offer,
  status,
  localVerifyStep,
  verifying,
  onStart,
  onVerify,
  onClaim,
  claiming,
}: {
  offer: PromoOffer
  status: PromoStatus
  localVerifyStep: number
  verifying: boolean
  onStart: () => void
  onVerify: () => void
  onClaim: () => void
  claiming: boolean
}) {
  return (
    <div className="id-promo__detail">
      <div
        className="id-promo__detail-hero"
        style={{ background: `linear-gradient(145deg, ${offer.color}22 0%, transparent 70%)` }}
      >
        <div
          className="id-promo__detail-icon"
          style={{ background: `${offer.color}20`, color: offer.color }}
          aria-hidden
        >
          {offer.initials}
        </div>
        <h2 className="id-promo__detail-name">{offer.merchantName}</h2>
        <p className="id-promo__detail-action">
          {offer.actionType} · +{offer.rewardAmount.toFixed(2)} iC
        </p>
        <p className="id-promo__detail-distance">{offer.distanceLabel}</p>
      </div>

      <p className="id-promo__detail-instruction">{offer.instruction}</p>

      <div className="id-promo__flow">
        <FlowStep label="Available" active={status === 'available'} done={status !== 'available'} />
        <FlowStep
          label="Started"
          active={status === 'started'}
          done={status === 'verified' || status === 'claimed'}
        />
        <FlowStep
          label="Verified"
          active={status === 'verified'}
          done={status === 'claimed'}
        />
        <FlowStep label="Claimed" active={status === 'claimed'} done={status === 'claimed'} />
      </div>

      {status === 'started' || status === 'verified' ? (
        <div className="id-promo__checks">
          <p className="id-promo__checks-title">Verification checklist · simulated</p>
          {PROMO_VERIFICATION_CHECKS.map((check, index) => {
            const done = status === 'verified' || index < localVerifyStep
            const active = status === 'started' && index === localVerifyStep && verifying
            return (
              <div
                key={check.id}
                className={`id-promo__check${done ? ' done' : ''}${active ? ' active' : ''}`}
              >
                <span className="id-promo__check-mark" aria-hidden>
                  {done ? '✓' : index + 1}
                </span>
                <span className="id-promo__check-text">
                  <span className="id-promo__check-label">{check.label}</span>
                  <span className="id-promo__check-sub">{check.sublabel}</span>
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="id-promo__detail-actions">
        {status === 'available' ? (
          <button type="button" className="id-promo__cta id-promo__cta--primary" onClick={onStart}>
            Start simulated check-in
          </button>
        ) : null}
        {status === 'started' ? (
          <button
            type="button"
            className="id-promo__cta id-promo__cta--primary"
            onClick={onVerify}
            disabled={verifying}
          >
            {verifying ? 'Verifying…' : 'Complete simulated verification'}
          </button>
        ) : null}
        {status === 'verified' ? (
          <button
            type="button"
            className="id-promo__cta id-promo__cta--primary"
            onClick={onClaim}
            disabled={claiming}
          >
            {claiming ? 'Claiming…' : 'Claim reward'}
          </button>
        ) : null}
        {status === 'claimed' ? (
          <p className="id-promo__claimed-note">Reward already claimed · simulated</p>
        ) : null}
      </div>
    </div>
  )
}

function FlowStep({
  label,
  active,
  done,
}: {
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div className={`id-promo__flow-step${active ? ' active' : ''}${done ? ' done' : ''}`}>
      <span className="id-promo__flow-dot" aria-hidden />
      <span className="id-promo__flow-label">{label}</span>
    </div>
  )
}
