import { useEffect, useRef, type CSSProperties } from 'react'
import {
  REMOTE_DEMO_PATH,
  REMOTE_MODES,
  REMOTE_SIGNAL_PANEL,
  REMOTE_TARGETS,
  remoteTargetById,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

const TICK_MS = 80

export function InvestorRemoteControlView() {
  const {
    state,
    goView,
    setPresenterStep,
    startRemoteSim,
    pauseRemoteSim,
    resetRemoteSim,
    setRemoteMode,
    selectRemoteTarget,
    updateRemoteFrame,
    openRemoteTarget,
  } = useInvestorDemo()

  const {
    remoteRunning,
    remoteMode,
    selectedRemoteTarget,
    remoteCursorPosition,
    remoteActivationProgress,
    remoteCommandLog,
  } = state

  const pathIndexRef = useRef(0)
  const blinkTickRef = useRef(0)
  const cursorRef = useRef(remoteCursorPosition)
  const progressRef = useRef(remoteActivationProgress)
  const modeRef = useRef(remoteMode)

  useEffect(() => {
    cursorRef.current = remoteCursorPosition
  }, [remoteCursorPosition])

  useEffect(() => {
    progressRef.current = remoteActivationProgress
  }, [remoteActivationProgress])

  useEffect(() => {
    modeRef.current = remoteMode
  }, [remoteMode])

  useEffect(() => {
    if (!remoteRunning) return

    const timer = window.setInterval(() => {
      const targetId = REMOTE_DEMO_PATH[pathIndexRef.current % REMOTE_DEMO_PATH.length]
      const target = remoteTargetById(targetId)
      const cur = cursorRef.current
      const mode = modeRef.current

      const dx = target.x - cur.x
      const dy = target.y - cur.y
      const dist = Math.hypot(dx, dy)

      let nextProgress = progressRef.current
      let nextCursor = { ...cur }

      if (dist > 2.5) {
        const speed = mode === 'gesture' ? 4.2 : 2.8
        nextCursor = {
          x: cur.x + (dx / dist) * speed,
          y: cur.y + (dy / dist) * speed,
        }
      } else {
        nextCursor = { x: target.x, y: target.y }
        const step = mode === 'dwell' ? 0.07 : mode === 'blink' ? 0.22 : 0.12
        nextProgress = Math.min(1, progressRef.current + step)

        if (mode === 'blink') {
          blinkTickRef.current += 1
          if (blinkTickRef.current % 4 === 0) {
            nextProgress = Math.min(1, nextProgress + 0.28)
          }
        }
      }

      if (nextProgress >= 1) {
        updateRemoteFrame({
          cursor: nextCursor,
          activationProgress: 0,
          selectedTarget: targetId,
          logEntry: {
            id: `remote-sim-${targetId}-${Date.now()}`,
            timeLabel: 'Sim',
            message: `${mode} activation · ${target.label} · simulated command`,
          },
        })
        pathIndexRef.current += 1
        blinkTickRef.current = 0
        return
      }

      updateRemoteFrame({
        cursor: nextCursor,
        activationProgress: nextProgress,
        selectedTarget: targetId,
      })
    }, TICK_MS)

    return () => window.clearInterval(timer)
  }, [remoteRunning, updateRemoteFrame])

  const handleBack = () => {
    pauseRemoteSim()
    setPresenterStep(1)
    goView('feed')
  }

  const handleReset = () => {
    pathIndexRef.current = 0
    blinkTickRef.current = 0
    resetRemoteSim()
  }

  const selectedLabel = remoteTargetById(selectedRemoteTarget).label
  const dwellPct = Math.round(remoteActivationProgress * 100)

  return (
    <div className="id-remote">
      <div className="id-remote__scroll">
        <button type="button" className="id-remote__back" onClick={handleBack}>
          <span className="id-remote__back-icon" aria-hidden>←</span>
          Feed
        </button>

        <header className="id-remote__header">
          <h1 className="id-remote__title">Remote Control</h1>
          <p className="id-remote__sub">Hands-free interaction layer</p>
        </header>

        <section className="id-remote__control" aria-label="Simulated phone control area">
          <div className="id-remote__control-frame">
            <div className="id-remote__control-grid">
              {REMOTE_TARGETS.map((target) => {
                const active = selectedRemoteTarget === target.id
                return (
                  <button
                    key={target.id}
                    type="button"
                    className={`id-remote__target${active ? ' active' : ''}`}
                    style={{ left: `${target.x}%`, top: `${target.y}%` }}
                    onClick={() => selectRemoteTarget(target.id)}
                    aria-pressed={active}
                  >
                    <span className="id-remote__target-label">{target.label}</span>
                    <span className="id-remote__target-sub">{target.sub}</span>
                    {active && remoteActivationProgress > 0 ? (
                      <span
                        className="id-remote__dwell-ring"
                        style={{ '--dwell': `${dwellPct}%` } as CSSProperties}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                )
              })}
            </div>

            <div
              className="id-remote__gaze"
              style={{
                left: `${remoteCursorPosition.x}%`,
                top: `${remoteCursorPosition.y}%`,
              }}
              aria-hidden
            >
              <span className="id-remote__gaze-core" />
              <span className="id-remote__gaze-ring" />
            </div>
          </div>
        </section>

        <section className="id-remote__modes">
          <p className="id-remote__panel-title">Control mode</p>
          <div className="id-remote__mode-row">
            {REMOTE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`id-remote__mode-btn${remoteMode === mode.id ? ' active' : ''}`}
                onClick={() => setRemoteMode(mode.id)}
              >
                <span className="id-remote__mode-label">{mode.label}</span>
                <span className="id-remote__mode-sub">{mode.sub}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="id-remote__signals">
          <p className="id-remote__panel-title">Signal panel</p>
          <div className="id-remote__signal-grid">
            {REMOTE_SIGNAL_PANEL.map((signal, i) => {
              const live =
                i === 0
                  ? remoteRunning
                    ? 'Stable · preview'
                    : 'Idle'
                  : i === 1
                    ? remoteMode === 'blink'
                      ? 'Armed · preview'
                      : 'Standby'
                    : i === 2
                      ? `${dwellPct}% dwell`
                      : i === 3
                        ? remoteMode === 'gesture'
                          ? 'Nod preview'
                          : 'Standby'
                        : 'Hands-free preview'
              return (
                <div key={signal.key} className="id-remote__signal">
                  <span className="id-remote__signal-key">{signal.key}</span>
                  <span className="id-remote__signal-val">{live}</span>
                  <span className="id-remote__signal-sub">{signal.sub}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="id-remote__timeline">
          <p className="id-remote__panel-title">Command timeline</p>
          {remoteCommandLog.length === 0 ? (
            <p className="id-remote__timeline-empty">
              Start simulation to preview gaze commands across targets.
            </p>
          ) : (
            <ul className="id-remote__timeline-list">
              {remoteCommandLog.map((entry) => (
                <li key={entry.id} className="id-remote__timeline-item">
                  <span className="id-remote__timeline-time">{entry.timeLabel}</span>
                  <span className="id-remote__timeline-msg">{entry.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="id-remote__controls">
          {remoteRunning ? (
            <button type="button" className="id-remote__btn" onClick={pauseRemoteSim}>
              Pause simulation
            </button>
          ) : (
            <button
              type="button"
              className="id-remote__btn id-remote__btn--primary"
              onClick={startRemoteSim}
            >
              Start simulation
            </button>
          )}
          <button type="button" className="id-remote__btn" onClick={handleReset}>
            Reset simulation
          </button>
          <button
            type="button"
            className="id-remote__btn id-remote__btn--accent"
            onClick={openRemoteTarget}
          >
            Open selected · {selectedLabel}
          </button>
        </div>

        <p className="id-remote__disclaimer">
          Simulated accessibility preview. No real camera, OS cursor, or device control.
        </p>
      </div>
    </div>
  )
}
