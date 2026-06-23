import { useEffect, useRef } from 'react'
import {
  FEED_ITEMS,
  POPLIVE_PRIVACY_RULES,
  POPLIVE_SAFE_ZONE,
  POPLIVE_SIGNAL_DEFS,
  POPLIVE_TABS,
  POPLIVE_TIMELINE,
  computePOPLiveMetrics,
  popLiveAttentionLabel,
  popLiveRiskLabel,
  popLiveTimelineStatuses,
  simulateGazeAtTick,
  type POPLiveSignalId,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

const TICK_MS = 50

export function InvestorPOPLiveView() {
  const {
    state,
    goView,
    startPOPLive,
    pausePOPLive,
    resetPOPLive,
    setPOPLiveTab,
    togglePOPLiveSignal,
    updatePOPLiveFrame,
  } = useInvestorDemo()

  const {
    selectedOfferId,
    popLiveRunning,
    popLiveTab,
    popLiveSignals,
    popLiveScore,
    popLiveEligibility,
    popLiveDriftState,
    popLiveFrame,
    popLiveSimTick,
  } = state

  const item = FEED_ITEMS.find((f) => f.id === selectedOfferId) ?? FEED_ITEMS[1]

  const metricsRef = useRef({
    score: popLiveScore,
    driftState: popLiveDriftState,
  })
  const tickRef = useRef(popLiveSimTick)
  const signalsRef = useRef(popLiveSignals)

  useEffect(() => {
    metricsRef.current.score = popLiveScore
    metricsRef.current.driftState = popLiveDriftState
  }, [popLiveScore, popLiveDriftState])

  useEffect(() => {
    tickRef.current = popLiveSimTick
  }, [popLiveSimTick])

  signalsRef.current = popLiveSignals

  useEffect(() => {
    if (!popLiveRunning) return

    const interval = setInterval(() => {
      const nextTick = tickRef.current + 1
      tickRef.current = nextTick
      const frame = simulateGazeAtTick(nextTick)
      const metrics = computePOPLiveMetrics(
        frame,
        signalsRef.current,
        metricsRef.current.driftState,
        metricsRef.current.score,
      )
      metricsRef.current = { score: metrics.score, driftState: metrics.driftState }
      updatePOPLiveFrame({
        frame,
        score: metrics.score,
        eligibility: metrics.eligibility,
        driftState: metrics.driftState,
        simTick: nextTick,
      })
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [popLiveRunning, updatePOPLiveFrame])

  const handleBack = () => {
    pausePOPLive()
    goView('watchVerify')
  }

  const eligibilityLabel =
    popLiveEligibility === 'eligible'
      ? 'Eligible'
      : popLiveEligibility === 'recovering'
        ? 'Recovering'
        : 'Not eligible'

  const timelineStatuses = popLiveTimelineStatuses(
    popLiveSimTick,
    popLiveDriftState,
    popLiveEligibility,
  )

  const signalActive = (id: POPLiveSignalId) => popLiveSignals[id]

  return (
    <div className="id-poplive">
      <div className="id-poplive__scroll">
        <button type="button" className="id-poplive__back" onClick={handleBack}>
          <span className="id-poplive__back-icon" aria-hidden>←</span>
          Watch Verify
        </button>

        <header className="id-poplive__header">
          <h1 className="id-poplive__title">POP Live</h1>
          <p className="id-poplive__sub">Real-time proof of presence demo</p>
        </header>

        <div className="id-poplive__privacy-pill" role="note">
          Simulated live demo · no camera access
        </div>

        <div className="id-poplive__tabs">
          {POPLIVE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`id-poplive__tab${popLiveTab === tab.id ? ' active' : ''}`}
              onClick={() => setPOPLiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {popLiveTab === 'live' ? (
          <>
            <div className="id-poplive__theater" aria-label="Simulated tracking theater">
              <div
                className="id-poplive__preview"
                style={{ background: item.bgGradient }}
              >
                <div className="id-poplive__scan-pulse" aria-hidden />
                <div className="id-poplive__face-frame" aria-hidden>
                  <span className="id-poplive__face-corner tl" />
                  <span className="id-poplive__face-corner tr" />
                  <span className="id-poplive__face-corner bl" />
                  <span className="id-poplive__face-corner br" />
                </div>
                <div
                  className="id-poplive__safe-zone"
                  style={{
                    left: `${POPLIVE_SAFE_ZONE.left}%`,
                    top: `${POPLIVE_SAFE_ZONE.top}%`,
                    width: `${POPLIVE_SAFE_ZONE.width}%`,
                    height: `${POPLIVE_SAFE_ZONE.height}%`,
                  }}
                  aria-hidden
                />
                <div
                  className={`id-poplive__gaze${popLiveFrame.inZone ? ' in-zone' : ' drift'}`}
                  style={{
                    left: `${popLiveFrame.gazeX}%`,
                    top: `${popLiveFrame.gazeY}%`,
                  }}
                  aria-hidden
                />
                <div className="id-poplive__preview-meta">
                  <span className="id-poplive__preview-brand">{item.brand}</span>
                  <span className="id-poplive__preview-platform">{item.platform}</span>
                </div>
              </div>
              <div
                className={`id-poplive__attention-label${
                  popLiveDriftState === 'drifting' ? ' drift' : ''
                }${popLiveDriftState === 'recovering' ? ' recovering' : ''}`}
                role="status"
              >
                {popLiveAttentionLabel(popLiveDriftState)}
              </div>
            </div>

            <div className="id-poplive__score-panel">
              <div className="id-poplive__score-main">
                <span className="id-poplive__score-key">POP score</span>
                <span className="id-poplive__score-val mono">{popLiveScore}%</span>
              </div>
              <div className="id-poplive__score-grid">
                <div className="id-poplive__score-cell">
                  <span className="id-poplive__score-key">Reward eligibility</span>
                  <span
                    className={`id-poplive__score-badge${
                      popLiveEligibility === 'eligible'
                        ? ' eligible'
                        : popLiveEligibility === 'recovering'
                          ? ' recovering'
                          : ''
                    }`}
                  >
                    {eligibilityLabel}
                  </span>
                </div>
                <div className="id-poplive__score-cell">
                  <span className="id-poplive__score-key">Risk level</span>
                  <span className="id-poplive__score-badge">{popLiveRiskLabel(popLiveScore)}</span>
                </div>
                <div className="id-poplive__score-cell">
                  <span className="id-poplive__score-key">Mode</span>
                  <span className="id-poplive__score-badge mode">Simulated</span>
                </div>
              </div>
            </div>

            <div className="id-poplive__signals-compact">
              {POPLIVE_SIGNAL_DEFS.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  className={`id-poplive__signal-chip${
                    signalActive(sig.id) ? ' on' : ' off'
                  }${popLiveFrame.inZone && signalActive(sig.id) ? ' glow' : ''}`}
                  onClick={() => togglePOPLiveSignal(sig.id)}
                  aria-pressed={signalActive(sig.id)}
                >
                  <span className="id-poplive__signal-chip-icon" aria-hidden>{sig.icon}</span>
                  <span className="id-poplive__signal-chip-label">{sig.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {popLiveTab === 'signals' ? (
          <section className="id-poplive__panel">
            <p className="id-poplive__panel-title">Live signals · simulated</p>
            <div className="id-poplive__signals">
              {POPLIVE_SIGNAL_DEFS.map((sig) => (
                <button
                  key={sig.id}
                  type="button"
                  className={`id-poplive__signal-card${
                    signalActive(sig.id) ? ' on' : ' off'
                  }${popLiveFrame.inZone && signalActive(sig.id) ? ' glow' : ''}`}
                  onClick={() => togglePOPLiveSignal(sig.id)}
                  aria-pressed={signalActive(sig.id)}
                >
                  <span className="id-poplive__signal-icon" aria-hidden>{sig.icon}</span>
                  <span className="id-poplive__signal-text">
                    <span className="id-poplive__signal-label">{sig.label}</span>
                    <span className="id-poplive__signal-sub">{sig.sub}</span>
                  </span>
                  <span className="id-poplive__signal-state">
                    {signalActive(sig.id) ? 'ON' : 'OFF'}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {popLiveTab === 'timeline' ? (
          <section className="id-poplive__panel">
            <p className="id-poplive__panel-title">Proof timeline</p>
            <div className="id-poplive__timeline">
              {POPLIVE_TIMELINE.map((step, i) => {
                const status = timelineStatuses[i] ?? 'pending'
                return (
                  <div
                    key={step.id}
                    className={`id-poplive__timeline-step ${status}`}
                  >
                    <div className="id-poplive__timeline-dot" aria-hidden>
                      {status === 'done' ? '✓' : status === 'drift' ? '!' : i + 1}
                    </div>
                    <div className="id-poplive__timeline-text">
                      <p className="id-poplive__timeline-label">{step.label}</p>
                      <p className="id-poplive__timeline-sub">{step.sub}</p>
                    </div>
                    <span className="id-poplive__timeline-status">
                      {status === 'done'
                        ? 'DONE'
                        : status === 'active'
                          ? 'LIVE'
                          : status === 'drift'
                            ? 'DRIFT'
                            : 'WAIT'}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}

        {popLiveTab === 'privacy' ? (
          <section className="id-poplive__panel">
            <p className="id-poplive__panel-title">Privacy & adapter</p>
            <ul className="id-poplive__rules">
              {POPLIVE_PRIVACY_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <p className="id-poplive__adapter-label">
              Tracking adapter ready: simulated → camera → WebGazer
            </p>
          </section>
        ) : null}

        <div className="id-poplive__controls">
          {popLiveRunning ? (
            <button type="button" className="id-poplive__btn" onClick={pausePOPLive}>
              Pause simulation
            </button>
          ) : (
            <button
              type="button"
              className="id-poplive__btn id-poplive__btn--primary"
              onClick={startPOPLive}
            >
              Start simulation
            </button>
          )}
          <button type="button" className="id-poplive__btn" onClick={resetPOPLive}>
            Reset simulation
          </button>
          <button type="button" className="id-poplive__btn" onClick={handleBack}>
            Return to verification
          </button>
        </div>

        <p className="id-poplive__disclaimer">
          Simulated POP demo. No camera, biometric processing, or real sensor access.
        </p>
      </div>
    </div>
  )
}
