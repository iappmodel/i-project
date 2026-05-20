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

function gatesForOffer(watchDur: string, scoreDisplay: string): GateRow[] {
  const scoreNum = (/^(\d+)/.exec(scoreDisplay)?.[1] ?? '80').trim()
  return [
    { name: 'Device signal', pendingLabel: 'Checking…', passLabel: 'Valid · on-device' },
    { name: 'Dwell threshold', pendingLabel: 'Pending', passLabel: `Met · ${watchDur} watched` },
    { name: 'Attention score', pendingLabel: 'Pending', passLabel: `Score ${scoreNum} · passed` },
    { name: 'Completion event', pendingLabel: 'Pending', passLabel: 'Received · complete' },
    { name: 'Fraud check', pendingLabel: 'Pending', passLabel: 'Clean · no flags' },
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
    const timers: ReturnType<typeof setTimeout>[] = []

    if (verificationStatus !== 'verifying') {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) {
            setPassedIdx(-1)
            setCollectReady(false)
          }
        }, 0),
      )
      return () => {
        cancelled = true
        timers.forEach(clearTimeout)
      }
    }

    timers.push(
      window.setTimeout(() => {
        if (!cancelled) {
          setPassedIdx(-1)
          setCollectReady(false)
        }
      }, 0),
    )
    gateDefs.forEach((_g, i) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setPassedIdx(i)
        }, (i + 1) * 550),
      )
    })
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setCollectReady(true)
      }, gateDefs.length * 550 + 300),
    )
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [verificationStatus, gateDefs])

  return (
    <PhoneFrame scroll>
      <h1 className="screen-title prot-tight-head">Verifying</h1>
      <p className="screen-sub prot-tight-sub">5-gate qualification · takes 2–3 seconds</p>

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
                  {done ? g.passLabel : i === 0 && passedIdx < 0 ? g.pendingLabel : g.pendingLabel}
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
        {collectReady ? 'Collect reward' : 'All gates passing…'}
      </button>
    </PhoneFrame>
  )
}
