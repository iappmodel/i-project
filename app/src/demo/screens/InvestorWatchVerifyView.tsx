import { useEffect, useRef, useState } from 'react'
import { FEED_ITEMS } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

const WATCH_DURATION_MS = 6000
const TICK_MS = 50

const RING_R = 38
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R

export function InvestorWatchVerifyView() {
  const { state, setWatchProgress, completeGate, claimReward, openPOPLive } = useInvestorDemo()

  const { verificationGates, watchProgress, selectedOfferId, verificationSession, rewardClaimed } =
    state
  const item = FEED_ITEMS.find((f) => f.id === selectedOfferId) ?? FEED_ITEMS[1]
  const rewardAmount = item.rewardAmount ?? 0.25

  const allGatesComplete = verificationGates.every((g) => g.completed)
  const completedRef = useRef<Set<string>>(new Set())
  const [claimPending, setClaimPending] = useState(false)

  // Reset gate tracking each verification session
  useEffect(() => {
    completedRef.current.clear()
    setClaimPending(false)
  }, [verificationSession])

  // Smooth timer — one interval per session
  useEffect(() => {
    const startedAt = Date.now()
    const tick = setInterval(() => {
      const elapsed = Date.now() - startedAt
      const progress = Math.min(elapsed / WATCH_DURATION_MS, 1)
      setWatchProgress(progress)
      if (progress >= 1) clearInterval(tick)
    }, TICK_MS)

    return () => clearInterval(tick)
  }, [verificationSession, setWatchProgress])

  // Complete gates sequentially as thresholds are crossed
  useEffect(() => {
    for (const gate of verificationGates) {
      if (
        watchProgress >= gate.completesAtProgress &&
        !gate.completed &&
        !completedRef.current.has(gate.id)
      ) {
        completedRef.current.add(gate.id)
        completeGate(gate.id)
      }
    }
  }, [watchProgress, verificationGates, completeGate])

  const pct = Math.min(Math.round(watchProgress * 100), 100)
  const earnSoFar = (watchProgress * rewardAmount).toFixed(3)
  const ringOffset = RING_CIRCUMFERENCE * (1 - watchProgress)
  const canClaim = allGatesComplete && !rewardClaimed && !claimPending

  const handleClaim = () => {
    if (!canClaim) return
    setClaimPending(true)
    claimReward(item.id)
  }

  return (
    <div className="id-watch">
      <div className="id-watch__bg-orb" aria-hidden />

      <div className="id-timer-line" style={{ width: `${pct}%` }} aria-hidden />

      <div className="id-watch__header">
        <div>
          <p className="id-watch__offer-label">Sponsored · {item.platform}</p>
          <p className="id-watch__offer-brand">{item.brand}</p>
        </div>
        <div
          className="id-watch__earn-counter"
          role="status"
          aria-label={`Earning ${earnSoFar} iCoins`}
        >
          <span className="id-watch__earn-dot" aria-hidden />
          <span className="id-watch__earn-val">{earnSoFar} iC</span>
        </div>
      </div>

      <div className="id-watch__visual">
        <div className="id-watch__ring">
          <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke={allGatesComplete ? 'var(--icoin-primary)' : 'var(--accent-cyan)'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              style={{ transition: 'stroke-dashoffset 0.08s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="id-watch__ring-label">
            <span className="id-watch__ring-pct">{pct}%</span>
            <span className="id-watch__ring-sub">verified</span>
          </div>
        </div>
      </div>

      <div className="id-watch__sim-banner" role="note">
        <span className="id-watch__sim-badge">Simulated POP</span>
        <span className="id-watch__sim-text">
          Demo only — no camera, no eye tracking, no device permissions
        </span>
      </div>

      <button type="button" className="id-watch__poplive-link" onClick={openPOPLive}>
        <span className="id-watch__poplive-icon" aria-hidden>◎</span>
        <span className="id-watch__poplive-text">
          <span className="id-watch__poplive-title">Live POP Demo</span>
          <span className="id-watch__poplive-sub">See attention confidence move in real time</span>
        </span>
        <span className="id-watch__poplive-pill" aria-hidden>POP Live</span>
        <span className="id-watch__poplive-arrow" aria-hidden>→</span>
      </button>

      <div className="id-watch__gates" role="list">
        {verificationGates.map((gate, index) => (
          <div
            key={gate.id}
            className={`id-watch__gate${gate.completed ? ' complete' : ''}`}
            role="listitem"
            style={{ animationDelay: gate.completed ? `${index * 0.04}s` : undefined }}
            aria-label={`${gate.label}: ${gate.completed ? 'passed' : 'pending'}`}
          >
            <div className="id-watch__gate-dot" aria-hidden>
              {gate.completed ? '✓' : index + 1}
            </div>
            <div className="id-watch__gate-text">
              <p className="id-watch__gate-label">{gate.label}</p>
              <p className="id-watch__gate-sublabel">{gate.sublabel}</p>
            </div>
            <span className="id-watch__gate-status">
              {gate.completed ? 'PASS' : 'WAIT'}
            </span>
          </div>
        ))}
      </div>

      {canClaim ? (
        <div className="id-watch__claim">
          <button
            type="button"
            className="id-watch__claim-btn"
            onClick={handleClaim}
            disabled={claimPending}
          >
            Claim verified reward ✓
          </button>
        </div>
      ) : allGatesComplete && rewardClaimed ? (
        <p className="id-watch__waiting id-watch__waiting--done" aria-live="polite">
          Reward already credited · Reset demo to run again
        </p>
      ) : (
        <p className="id-watch__waiting" aria-live="polite">
          Verifying attention… {Math.max(0, Math.ceil((1 - watchProgress) * (WATCH_DURATION_MS / 1000)))}s
        </p>
      )}
    </div>
  )
}
