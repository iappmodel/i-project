import { useEffect, useRef } from 'react'
import { FEED_ITEMS } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

const WATCH_DURATION_MS = 8000
const TICK_MS = 80

// Ring SVG dimensions
const RING_R = 38
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R

export function InvestorWatchVerifyView() {
  const { state, setWatchProgress, completeGate, creditReward } =
    useInvestorDemo()

  const { verificationGates, watchProgress, selectedOfferId } = state
  const item = FEED_ITEMS.find((f) => f.id === selectedOfferId) ?? FEED_ITEMS[1]
  const rewardAmount = item.rewardAmount ?? 0.25

  const allGatesComplete = verificationGates.every((g) => g.completed)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Gate completion by index (gated to prevent re-firing)
  const completedRef = useRef<Set<string>>(new Set())

  // Run timer only while not fully complete
  useEffect(() => {
    if (watchProgress >= 1) return

    intervalRef.current = setInterval(() => {
      setWatchProgress(Math.min(watchProgress + TICK_MS / WATCH_DURATION_MS, 1))
    }, TICK_MS)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  // We intentionally re-run on each watchProgress tick to step forward
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchProgress])

  // Complete gates as thresholds are crossed
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const pct = Math.min(Math.round(watchProgress * 100), 100)
  const earnSoFar = (watchProgress * rewardAmount).toFixed(4)
  const ringOffset = RING_CIRCUMFERENCE * (1 - watchProgress)

  const handleClaim = () => {
    creditReward(item.id)
  }

  return (
    <div className="id-watch">
      {/* Background orb */}
      <div className="id-watch__bg-orb" aria-hidden />

      {/* Timer line */}
      <div
        className="id-timer-line"
        style={{ width: `${pct}%` }}
        aria-hidden
      />

      {/* Header */}
      <div className="id-watch__header">
        <div>
          <p className="id-watch__offer-label">Sponsored · {item.platform}</p>
          <p className="id-watch__offer-brand">{item.brand}</p>
        </div>
        <div className="id-watch__earn-counter" role="status" aria-label={`Earning ${earnSoFar} iCoins`}>
          <span className="id-watch__earn-dot" aria-hidden />
          <span className="id-watch__earn-val">{earnSoFar} iC</span>
        </div>
      </div>

      {/* Attention ring */}
      <div className="id-watch__visual">
        <div className="id-watch__ring">
          <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden>
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="4"
            />
            {/* Progress */}
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
              style={{ transition: 'stroke-dashoffset 0.12s linear, stroke 0.3s' }}
            />
          </svg>
          <div className="id-watch__ring-label">
            <span className="id-watch__ring-pct">{pct}%</span>
            <span className="id-watch__ring-sub">verified</span>
          </div>
        </div>
      </div>

      {/* Simulated POP note */}
      <p className="id-watch__sim-note">
        simulated pop · no camera access
      </p>

      {/* Gates */}
      <div className="id-watch__gates" role="list">
        {verificationGates.map((gate) => (
          <div
            key={gate.id}
            className={`id-watch__gate${gate.completed ? ' complete' : ''}`}
            role="listitem"
            aria-label={`${gate.label}: ${gate.completed ? 'passed' : 'pending'}`}
          >
            <div className="id-watch__gate-dot" aria-hidden>
              {gate.completed ? '✓' : ''}
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

      {/* CTA or waiting message */}
      {allGatesComplete ? (
        <div className="id-watch__claim">
          <button
            type="button"
            className="id-watch__claim-btn"
            onClick={handleClaim}
          >
            Claim verified reward ✓
          </button>
        </div>
      ) : (
        <p className="id-watch__waiting" aria-live="polite">
          Verifying attention…
        </p>
      )}
    </div>
  )
}
