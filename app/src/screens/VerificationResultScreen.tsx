import { useEffect, useState } from 'react'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { VerificationGate } from '../components/VerificationGate'
import { DEFAULT_SPONSORED_OFFER, VERIFICATION_GATES } from '../data/demoData'
import { formatIcoinsAmount } from '../lib/format'
import { useDemo } from '../state/useDemo'

const GATE_STEP_MS = 480

export function VerificationResultScreen() {
  const { claimReward, selectedOffer, verificationStatus, canCollectReward, attentionSession } = useDemo()
  const offer = selectedOffer ?? DEFAULT_SPONSORED_OFFER

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
      if (tick <= VERIFICATION_GATES.length) {
        setPassedIdx(tick - 1)
      }
      if (tick >= VERIFICATION_GATES.length) {
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
  }, [verificationStatus])

  return (
    <PhoneFrame scroll>
      <h1 className="screen-title prot-tight-head">Verifying</h1>
      <p className="screen-sub prot-tight-sub">5 checkpoints · completes in ~2–3 seconds</p>
      <p className="gate-list-hint mono-muted">{formatIcoinsAmount(offer.rewardICoins)} queued</p>
      <div className="prot-gate-list">
        {VERIFICATION_GATES.map((g, i) => {
          const done = passedIdx >= i
          const passLabel =
            g.id === 'dwell'
              ? `Elapsed · ${offer.watchDuration ?? '4:30'} verified`
              : g.id === 'attention'
                ? `${offer.attentionScoreDisplay ?? '80 / 100'} clears threshold`
                : g.passLabel
          return (
            <VerificationGate
              key={g.id}
              name={g.name}
              status={done ? passLabel : g.pendingLabel}
              passed={done}
            />
          )
        })}
      </div>
      <Button
        className="prot-cta cta-wallet"
        disabled={!collectReady || !canCollectReward}
        onClick={() => claimReward()}
      >
        {!attentionSession
          ? 'Session required'
          : !canCollectReward
            ? 'Validate attention first'
            : collectReady
              ? 'Collect reward'
              : 'Checking gates…'}
      </Button>
      <SourceEvidence
        paths={[
          '06_feed_earning_loops/iapp_loop1_watch_verify_earn.html',
          '01_strategy_docs/i-app-masterplan.md (5-gate qualification)',
          'integrations/eye-tracking/demos/investor-demo/src/screens/VerificationResultScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
