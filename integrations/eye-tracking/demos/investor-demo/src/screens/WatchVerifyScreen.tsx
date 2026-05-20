import { useEffect, useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { PhoneFrame } from '../components/PhoneFrame'
import { DEFAULT_SPONSORED_OFFER } from '../demo/mockData'
import { useDemo } from '../demo/useDemo'

function watchTotalTicks(duration?: string): number {
  if (!duration?.includes(':')) return 270
  const [m, s] = duration.split(':').map((x) => Number(x))
  if (!Number.isFinite(m) || !Number.isFinite(s)) return 270
  const sec = m * 60 + s
  return Math.max(90, Math.min(400, Math.round(sec * 3)))
}

export function WatchVerifyScreen() {
  const { selectedOffer, setScreen, completeVerification, verificationStatus } = useDemo()
  const offer = selectedOffer ?? DEFAULT_SPONSORED_OFFER

  const totalTicks = useMemo(() => watchTotalTicks(offer.watchDuration), [offer.watchDuration])
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = window.setTimeout(() => setElapsed(0), 0)
    return () => clearTimeout(id)
  }, [offer.id])

  useEffect(() => {
    if (verificationStatus !== 'watching') return undefined
    const id = window.setInterval(() => {
      setElapsed((e) => (e >= totalTicks ? totalTicks : e + 1))
    }, 50)
    return () => window.clearInterval(id)
  }, [verificationStatus, totalTicks])

  const pct = Math.min(100, (elapsed / totalTicks) * 100)
  const remaining = Math.max(
    0,
    Math.ceil(((totalTicks - elapsed) / totalTicks) * (() => {
      const [mm, ss] = (offer.watchDuration ?? '4:30').split(':').map(Number)
      return (Number(mm) || 0) * 60 + (Number(ss) || 0)
    })()),
  )
  const remM = Math.floor(remaining / 60)
  const remS = remaining % 60
  const timerLabel = `${remM}:${String(remS).padStart(2, '0')}`

  const score = Math.min(98, Math.max(72, Math.round(75 + Math.sin(elapsed * 0.1) * 12)))
  const arcCirc = 213
  const dashOffset = arcCirc - (arcCirc * score) / 100
  const earnedI = ((pct / 100) * offer.rewardICoins).toFixed(2)

  const canFinish = pct >= 99.5

  return (
    <PhoneFrame>
      <BackRow label="Offer" onBack={() => setScreen('offer-detail')} />

      <div className="watch-screen-prot">
        <div className="watch-scrim-prot" aria-hidden />
        <div className="watch-hud-top-prot">
          <div className="tracking-badge-prot">
            <span className="tb-dot-prot" />
            <span className="tb-label-prot mono">tracking</span>
          </div>
          <div className="timer-badge-prot mono">{timerLabel}</div>
        </div>

        <svg
          className="attention-score-ring-prot"
          width="80"
          height="80"
          viewBox="0 0 80 80"
          aria-hidden
        >
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="var(--icoin-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={arcCirc}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 40 40)"
          />
          <text
            x="40"
            y="36"
            textAnchor="middle"
            fill="var(--icoin-primary)"
            className="attn-svg-num mono"
          >
            {score}
          </text>
          <text x="40" y="50" textAnchor="middle" fill="rgba(240,237,232,0.4)" className="attn-svg-sub">
            attention
          </text>
        </svg>

        <div className="watch-hud-bottom-prot">
          <div className="watch-earn-bar-prot">
            <div className="web-fill-prot" style={{ width: `${pct}%` }} />
          </div>
          <div className="watch-earn-row-prot">
            <span className="wer-label-prot">Watch &amp; earn</span>
            <span className="wer-val-prot mono">+{earnedI} i</span>
          </div>
        </div>
      </div>

      <div style={{ height: '10px' }} />

      <button
        type="button"
        className="prot-cta"
        disabled={!canFinish}
        onClick={() => completeVerification()}
      >
        Complete &amp; verify
      </button>

      <p className="legal-hint mono-muted">
        Demo gaze signals are mocked (ref: iapp_loop1_watch_verify_earn).
      </p>
    </PhoneFrame>
  )
}
