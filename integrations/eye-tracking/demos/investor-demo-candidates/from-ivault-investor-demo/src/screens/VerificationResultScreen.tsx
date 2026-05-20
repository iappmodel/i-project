import { useEffect, useMemo, useState } from 'react'
import { PhoneFrame } from '../components/PhoneFrame'
import { formatIcoinsAmount } from '../demo/format'
import { DEFAULT_SPONSORED_OFFER } from '../demo/mockData'
import { useDemo } from '../demo/useDemo'

type GateRow = {
  name: string
  pendingLabel: string
  passLabel: string
}

/** ~2.5s sequencing + cushion before CTA; interval-based avoids stuck pending from timer races */
const GATE_STEP_MS = 480

function gatesForOffer(watchDur: string, scoreDisplay: string): GateRow[] {
  return [
    {
      name: 'Presence detected',
      pendingLabel: 'Checking…',
      passLabel: 'On-device presence · seated',
    },
    {
      name: 'Required watch time met',
      pendingLabel: 'Pending',
      passLabel: `Elapsed · ${watchDur} verified`,
    },
    {
      name: 'Attention score passed',
      pendingLabel: 'Pending',
      passLabel: `${scoreDisplay.trim()} clears threshold`,
    },
    {
      name: 'Completion received',
      pendingLabel: 'Pending',
      passLabel: 'Session sealed · payout eligible',
    },
    {
      name: 'Fraud flags clean',
      pendingLabel: 'Pending',
      passLabel: 'No anomalies · no escalation',
    },
  ]
}

export function VerificationResultScreen() {
  const { claimReward, selectedOffer, verificationStatus } = useDemo()
  const offer = selectedOffer ?? DEFAULT_SPONSORED_OFFER

  const watchDur = offer.watchDuration ?? '4:30'
  const scoreDisp = offer.attentionScoreDisplay ?? '80 / 100'

  const gateDefs = useMemo(
    () => gatesForOffer(watchDur, scoreDisp),
    [watchDur, scoreDisp],
  )

  const [passedIdx, setPassedIdx] = useState(-1)
  const [collectReady, setCollectReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let finalizeTimer: ReturnType<typeof setTimeout> | undefined

    if (verificationStatus !== 'verifying') {
      const t = window.setTimeout(() => {
        if (!cancelled) {
          setPassedIdx(-1)
          setCollectReady(false)
        }
      }, 0)
      return () => {
        cancelled = true
        clearTimeout(t)
      }
    }

    const resetTimer = window.setTimeout(() => {
      if (!cancelled) {
        setPassedIdx(-1)
        setCollectReady(false)
      }
    }, 0)

    let tick = 0
    const iv = window.setInterval(() => {
      if (cancelled) return
      tick++
      if (tick <= gateDefs.length) {
        setPassedIdx(tick - 1)
      }
      if (tick >= gateDefs.length) {
        window.clearInterval(iv)
        finalizeTimer = window.setTimeout(() => {
          if (!cancelled) setCollectReady(true)
        }, 200)
      }
    }, GATE_STEP_MS)

    return () => {
      cancelled = true
      clearTimeout(resetTimer)
      if (finalizeTimer) clearTimeout(finalizeTimer)
      clearInterval(iv)
    }
  }, [verificationStatus, gateDefs.length])

  return (
    <PhoneFrame scroll>
      <h1 className="screen-title prot-tight-head">Verifying</h1>
      <p className="screen-sub prot-tight-sub">5 checkpoints · completes in ~2–3 seconds</p>

      <p className="gate-list-hint mono-muted">{formatIcoinsAmount(offer.rewardICoins)} queued</p>

      <div className="prot-gate-list">
        {gateDefs.map((g, i) => {
          const done = passedIdx >= i
          const showCheck = passedIdx >= i
          return (
            <div key={g.name} className="prot-gate-item">
              <div
                className={`prot-gate-icon ${showCheck ? 'pass' : ''}`}
                style={{ background: 'var(--bg-raised)' }}
              >
                {!showCheck ? (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <circle cx="5" cy="5" r="4" stroke="var(--text-muted)" strokeWidth="1" fill="none" />
                  </svg>
                ) : (
                  <span className="prot-gate-check">✓</span>
                )}
              </div>
              <div className="prot-gate-text">
                <div className="prot-gate-name">{g.name}</div>
                <div
                  className="prot-gate-status mono"
                  style={{ color: done ? 'var(--icoin-primary)' : 'var(--text-muted)' }}
                >
                  {done ? g.passLabel : g.pendingLabel}
                </div>
              </div>
              <div
                className="prot-gate-tick"
                style={{ color: showCheck ? 'var(--icoin-primary)' : 'var(--text-muted)' }}
              >
                {showCheck ? '✓' : '·'}
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="prot-cta cta-wallet"
        disabled={!collectReady}
        style={{ opacity: collectReady ? 1 : 0.35 }}
        onClick={() => claimReward()}
      >
        {collectReady ? 'Collect reward' : 'Checking gates…'}
      </button>
    </PhoneFrame>
  )
}
