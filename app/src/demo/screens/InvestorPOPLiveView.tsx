import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FEED_ITEMS,
  POPLIVE_CALIBRATION_POINTS,
  POPLIVE_CALIBRATION_TOTAL,
  POPLIVE_PRIVACY_RULES,
  POPLIVE_SAFE_ZONE,
  POPLIVE_SIGNAL_DEFS,
  POPLIVE_TABS,
  POPLIVE_TIMELINE,
  computePOPLiveMetrics,
  mapScreenGazeToTheaterFrame,
  popLiveAttentionLabel,
  popLiveCameraPermissionLabel,
  popLiveModeLabel,
  popLiveRiskLabel,
  popLiveTimelineStatuses,
  simulateGazeAtTick,
  type POPLiveSignalId,
} from '../investorDemoData'
import {
  attachGazeListener,
  beginWebGazerPreview,
  hideWebGazerDom,
  isCameraDeniedError,
  recordCalibrationClick,
  stopInvestorWebGazer,
} from '../investorWebGazerAdapter'
import type { WebGazerAPI } from '../../types/webgazer'
import { useInvestorDemo } from '../useInvestorDemoState'

const TICK_MS = 50

export function InvestorPOPLiveView() {
  const {
    state,
    goView,
    showToast,
    startPOPLive,
    pausePOPLive,
    resetPOPLive,
    setPOPLiveTab,
    togglePOPLiveSignal,
    updatePOPLiveFrame,
    setWebGazerStatus,
    registerCalibrationPoint,
    webGazerFallbackSimulated,
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
    popTrackingMode,
    popWebGazerStatus,
    popWebGazerError,
    popCalibrationStep,
    popCalibrationVisited,
  } = state

  const item = FEED_ITEMS.find((f) => f.id === selectedOfferId) ?? FEED_ITEMS[1]

  const [showWebGazerConsent, setShowWebGazerConsent] = useState(false)
  const [gazeSearching, setGazeSearching] = useState(false)

  const theaterRef = useRef<HTMLDivElement>(null)
  const wgRef = useRef<WebGazerAPI | null>(null)
  const detachGazeRef = useRef<(() => void) | null>(null)
  const metricsRef = useRef({
    score: popLiveScore,
    driftState: popLiveDriftState,
    frame: popLiveFrame,
  })
  const tickRef = useRef(popLiveSimTick)
  const signalsRef = useRef(popLiveSignals)

  useEffect(() => {
    metricsRef.current.score = popLiveScore
    metricsRef.current.driftState = popLiveDriftState
    metricsRef.current.frame = popLiveFrame
  }, [popLiveScore, popLiveDriftState, popLiveFrame])

  useEffect(() => {
    tickRef.current = popLiveSimTick
  }, [popLiveSimTick])

  signalsRef.current = popLiveSignals

  const fallbackToSimulated = useCallback(
    async (error?: string | null, toastMessage?: string) => {
      detachGazeRef.current?.()
      detachGazeRef.current = null
      wgRef.current = null
      await stopInvestorWebGazer()
      webGazerFallbackSimulated(error ?? null)
      setShowWebGazerConsent(false)
      setGazeSearching(false)
      showToast(
        toastMessage ?? 'WebGazer preview unavailable. Simulated POP remains active.',
      )
    },
    [showToast, webGazerFallbackSimulated],
  )

  const applyGazeToTheater = useCallback(
    (screenX: number | null, screenY: number | null) => {
      const theater = theaterRef.current
      if (!theater) return

      if (screenX == null || screenY == null) {
        setGazeSearching(true)
        const conservative = computePOPLiveMetrics(
          metricsRef.current.frame,
          { ...signalsRef.current, gazeOnContent: false },
          metricsRef.current.driftState,
          Math.max(52, metricsRef.current.score - 3),
        )
        metricsRef.current = {
          score: conservative.score,
          driftState: conservative.driftState,
          frame: metricsRef.current.frame,
        }
        updatePOPLiveFrame({
          frame: metricsRef.current.frame,
          score: conservative.score,
          eligibility: conservative.eligibility,
          driftState: conservative.driftState,
        })
        return
      }

      setGazeSearching(false)
      const frame = mapScreenGazeToTheaterFrame(
        screenX,
        screenY,
        theater.getBoundingClientRect(),
      )
      const metrics = computePOPLiveMetrics(
        frame,
        signalsRef.current,
        metricsRef.current.driftState,
        metricsRef.current.score,
      )
      metricsRef.current = {
        score: metrics.score,
        driftState: metrics.driftState,
        frame,
      }
      updatePOPLiveFrame({
        frame,
        score: metrics.score,
        eligibility: metrics.eligibility,
        driftState: metrics.driftState,
      })
    },
    [updatePOPLiveFrame],
  )

  const startWebGazerFlow = useCallback(async () => {
    setShowWebGazerConsent(false)
    pausePOPLive()
    setWebGazerStatus('loading', null)

    try {
      const wg = await beginWebGazerPreview()
      wgRef.current = wg
      setWebGazerStatus('calibrating', null)
      hideWebGazerDom()
    } catch (err) {
      if (isCameraDeniedError(err)) {
        await fallbackToSimulated(
          'Camera preview denied. Simulated POP remains active.',
          'Camera preview denied. Simulated POP remains active.',
        )
      } else {
        await fallbackToSimulated(
          err instanceof Error ? err.message : 'WebGazer failed',
        )
      }
    }
  }, [fallbackToSimulated, pausePOPLive, setWebGazerStatus])

  useEffect(() => {
    if (popWebGazerStatus !== 'running' || !wgRef.current) return

    detachGazeRef.current?.()
    detachGazeRef.current = attachGazeListener(wgRef.current, applyGazeToTheater)
    const hideTimer = window.setInterval(hideWebGazerDom, 400)

    return () => {
      window.clearInterval(hideTimer)
      detachGazeRef.current?.()
      detachGazeRef.current = null
    }
  }, [popWebGazerStatus, applyGazeToTheater])

  useEffect(() => {
    if (popTrackingMode === 'webgazer' || !popLiveRunning) return

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
      metricsRef.current = { score: metrics.score, driftState: metrics.driftState, frame }
      updatePOPLiveFrame({
        frame,
        score: metrics.score,
        eligibility: metrics.eligibility,
        driftState: metrics.driftState,
        simTick: nextTick,
      })
    }, TICK_MS)

    return () => clearInterval(interval)
  }, [popLiveRunning, popTrackingMode, updatePOPLiveFrame])

  useEffect(() => {
    return () => {
      detachGazeRef.current?.()
      void stopInvestorWebGazer()
    }
  }, [])

  const handleCalibrationDot = async (
    pointId: number,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (popCalibrationVisited.includes(pointId) || !wgRef.current) return
    const rect = event.currentTarget.getBoundingClientRect()
    recordCalibrationClick(
      wgRef.current,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    )
    registerCalibrationPoint(pointId)
  }

  const handleStopWebGazer = async () => {
    await fallbackToSimulated(null, 'Returned to simulated POP Live.')
    setWebGazerStatus('idle', null)
  }

  const handleReset = async () => {
    await stopInvestorWebGazer()
    wgRef.current = null
    detachGazeRef.current?.()
    detachGazeRef.current = null
    setShowWebGazerConsent(false)
    setGazeSearching(false)
    resetPOPLive()
  }

  const handleBack = async () => {
    pausePOPLive()
    await stopInvestorWebGazer()
    wgRef.current = null
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

  const isWebGazerActive =
    popWebGazerStatus === 'calibrating' || popWebGazerStatus === 'running'

  const attentionLabel = gazeSearching
    ? 'Calibrating / searching'
    : popLiveAttentionLabel(popLiveDriftState)

  const modeLabel = popLiveModeLabel(popTrackingMode, popWebGazerStatus)
  const cameraLabel = popLiveCameraPermissionLabel(popWebGazerStatus)

  const signalModeSuffix =
    popTrackingMode === 'webgazer' && popWebGazerStatus === 'running'
      ? 'live preview'
      : 'simulated'

  return (
    <div className="id-poplive">
      <div className="id-poplive__scroll">
        <button type="button" className="id-poplive__back" onClick={() => void handleBack()}>
          <span className="id-poplive__back-icon" aria-hidden>←</span>
          Watch Verify
        </button>

        <header className="id-poplive__header">
          <h1 className="id-poplive__title">POP Live</h1>
          <p className="id-poplive__sub">Real-time proof of presence demo</p>
        </header>

        <div
          className={`id-poplive__privacy-pill${
            isWebGazerActive ? ' id-poplive__privacy-pill--wg' : ''
          }`}
          role="note"
        >
          {isWebGazerActive
            ? 'Experimental WebGazer preview. No video is stored by this demo.'
            : 'Simulated live demo · no camera access'}
        </div>

        <div className="id-poplive__mode-bar">
          <span className={`id-poplive__status-pill${isWebGazerActive ? ' wg' : ''}`}>
            Mode: {modeLabel}
          </span>
          <span className="id-poplive__status-pill">
            Camera: {cameraLabel}
          </span>
          {(popWebGazerStatus === 'calibrating' || popWebGazerStatus === 'running') && (
            <span className="id-poplive__status-pill cal">
              Calibration: {popCalibrationStep}/{POPLIVE_CALIBRATION_TOTAL}
            </span>
          )}
        </div>

        {!isWebGazerActive && popWebGazerStatus === 'idle' && !showWebGazerConsent ? (
          <button
            type="button"
            className="id-poplive__wg-entry"
            onClick={() => setShowWebGazerConsent(true)}
          >
            <span className="id-poplive__wg-entry-icon" aria-hidden>◎</span>
            <span className="id-poplive__wg-entry-text">
              <span className="id-poplive__wg-entry-title">Try camera gaze preview</span>
              <span className="id-poplive__wg-entry-sub">Experimental local WebGazer adapter</span>
            </span>
          </button>
        ) : null}

        {showWebGazerConsent ? (
          <div className="id-poplive__wg-consent" role="note">
            <p className="id-poplive__wg-consent-text">
              Experimental local gaze preview. Camera permission is required. No video is stored
              by this demo.
            </p>
            <div className="id-poplive__wg-consent-actions">
              <button
                type="button"
                className="id-poplive__btn id-poplive__btn--primary"
                onClick={() => void startWebGazerFlow()}
              >
                Start WebGazer preview
              </button>
              <button
                type="button"
                className="id-poplive__btn"
                onClick={() => setShowWebGazerConsent(false)}
              >
                Keep simulated mode
              </button>
            </div>
          </div>
        ) : null}

        {popWebGazerStatus === 'loading' ? (
          <p className="id-poplive__wg-loading">Loading WebGazer preview…</p>
        ) : null}

        {(popWebGazerStatus === 'denied' || popWebGazerStatus === 'failed') && popWebGazerError ? (
          <p className="id-poplive__wg-fallback" role="status">
            {popWebGazerError}
          </p>
        ) : null}

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
            <div className="id-poplive__theater" aria-label="POP tracking theater">
              <div
                ref={theaterRef}
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
                {popWebGazerStatus !== 'calibrating' ? (
                  <div
                    className={`id-poplive__gaze${popLiveFrame.inZone ? ' in-zone' : ' drift'}`}
                    style={{
                      left: `${popLiveFrame.gazeX}%`,
                      top: `${popLiveFrame.gazeY}%`,
                    }}
                    aria-hidden
                  />
                ) : null}
                {popWebGazerStatus === 'calibrating' ? (
                  <div className="id-poplive__calibration" aria-label="Calibration overlay">
                    <p className="id-poplive__calibration-hint">
                      Tap each dot to calibrate gaze estimate
                    </p>
                    {POPLIVE_CALIBRATION_POINTS.map((point) => {
                      const done = popCalibrationVisited.includes(point.id)
                      return (
                        <button
                          key={point.id}
                          type="button"
                          className={`id-poplive__calibration-dot${done ? ' done' : ''}`}
                          style={{ left: `${point.x}%`, top: `${point.y}%` }}
                          onClick={(e) => void handleCalibrationDot(point.id, e)}
                          disabled={done}
                          aria-label={`Calibration point ${point.id + 1}`}
                        />
                      )
                    })}
                  </div>
                ) : null}
                <div className="id-poplive__preview-meta">
                  <span className="id-poplive__preview-brand">{item.brand}</span>
                  <span className="id-poplive__preview-platform">{item.platform}</span>
                </div>
              </div>
              <div
                className={`id-poplive__attention-label${
                  popLiveDriftState === 'drifting' ? ' drift' : ''
                }${popLiveDriftState === 'recovering' ? ' recovering' : ''}${
                  gazeSearching ? ' searching' : ''
                }`}
                role="status"
              >
                {attentionLabel}
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
                  <span className="id-poplive__score-badge mode">{modeLabel}</span>
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
            <p className="id-poplive__panel-title">Live signals · {signalModeSuffix}</p>
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
                  <div key={step.id} className={`id-poplive__timeline-step ${status}`}>
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
              Tracking adapter ready: simulated → WebGazer preview (optional)
            </p>
          </section>
        ) : null}

        <div className="id-poplive__controls">
          {isWebGazerActive ? (
            <button type="button" className="id-poplive__btn" onClick={() => void handleStopWebGazer()}>
              Stop WebGazer preview
            </button>
          ) : popLiveRunning ? (
            <button type="button" className="id-poplive__btn" onClick={pausePOPLive}>
              Pause simulation
            </button>
          ) : (
            <button
              type="button"
              className="id-poplive__btn id-poplive__btn--primary"
              onClick={startPOPLive}
              disabled={popWebGazerStatus === 'loading'}
            >
              Start simulation
            </button>
          )}
          <button type="button" className="id-poplive__btn" onClick={() => void handleReset()}>
            Reset simulation
          </button>
          <button type="button" className="id-poplive__btn" onClick={() => void handleBack()}>
            Return to verification
          </button>
        </div>

        <p className="id-poplive__disclaimer">
          Simulated POP demo available without camera access.
          {isWebGazerActive
            ? ' Experimental WebGazer preview. No video is stored by this demo.'
            : ' No camera, biometric processing, or real sensor access in simulated mode.'}
        </p>
      </div>
    </div>
  )
}
