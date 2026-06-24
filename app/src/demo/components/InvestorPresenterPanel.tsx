import { PRESENTER_STEPS } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorModeSwitch } from './InvestorModeSwitch'

export function InvestorPresenterPanel() {
  const { state, presenterNext, presenterBack, goPresenterStep, reset, showToast, openElo, openProductMap } =
    useInvestorDemo()

  const { presenterStepIndex } = state
  const step = PRESENTER_STEPS[presenterStepIndex]

  const isFirst = presenterStepIndex === 0
  const isLast = presenterStepIndex === PRESENTER_STEPS.length - 1

  const handleReset = () => {
    reset()
    showToast('Demo reset')
  }

  return (
    <aside className="id-presenter">
      <div className="id-presenter__inner">
        <div className="id-presenter__steps" role="tablist" aria-label="Presenter steps">
          {PRESENTER_STEPS.map((s, i) => (
            <button
              key={s.index}
              type="button"
              role="tab"
              aria-selected={i === presenterStepIndex}
              className={`id-presenter__step-dot${i === presenterStepIndex ? ' on' : ''}`}
              aria-label={`Step ${i + 1}: ${s.title}`}
              onClick={() => goPresenterStep(i)}
            />
          ))}
        </div>

        <p className="id-presenter__eyebrow">
          Step {presenterStepIndex + 1} of {PRESENTER_STEPS.length} · Investor Demo
        </p>

        <h2 className="id-presenter__title">{step.title}</h2>

        <ul className="id-presenter__bullets">
          {step.bullets.map((b, i) => (
            <li key={i} className="id-presenter__bullet">
              {b}
            </li>
          ))}
        </ul>

        <InvestorModeSwitch />

        <div className="id-presenter__controls">
          <button
            type="button"
            className="id-presenter__btn"
            onClick={presenterBack}
            disabled={isFirst}
            aria-label="Previous step"
          >
            ← Back
          </button>
          <button
            type="button"
            className="id-presenter__btn id-presenter__btn--next"
            onClick={presenterNext}
            disabled={isLast}
            aria-label="Next step"
          >
            Next →
          </button>
          <button
            type="button"
            className="id-presenter__btn id-presenter__btn--reset"
            onClick={handleReset}
            aria-label="Reset demo"
            title="Reset to start"
          >
            ↺
          </button>
        </div>
        <div className="id-presenter__system-tools">
          <button type="button" className="id-presenter__system-btn" onClick={openElo}>
            <span className="id-presenter__system-title">ELO</span>
            <span className="id-presenter__system-sub">Open assistant preview</span>
          </button>
          <button type="button" className="id-presenter__system-btn" onClick={openProductMap}>
            <span className="id-presenter__system-title">Product Map</span>
            <span className="id-presenter__system-sub">Show ecosystem</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
