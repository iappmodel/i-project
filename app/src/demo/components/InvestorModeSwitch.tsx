import { DEMO_MODE_CONTEXT, DEMO_MODES } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorModeSwitch() {
  const { state, setDemoMode } = useInvestorDemo()
  const { activeDemoMode } = state
  const context = DEMO_MODE_CONTEXT[activeDemoMode]

  return (
    <section className="id-mode-switch" aria-label="Demo mode switch">
      <p className="id-mode-switch__label">Demo mode</p>
      <div className="id-mode-switch__row">
        {DEMO_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`id-mode-switch__btn${activeDemoMode === mode.id ? ' active' : ''}`}
            onClick={() => setDemoMode(mode.id)}
            aria-pressed={activeDemoMode === mode.id}
            title={mode.sub}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="id-mode-switch__context">
        <p className="id-mode-switch__context-title">{context.title}</p>
        <ul className="id-mode-switch__context-list">
          {context.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>

      <p className="id-mode-switch__disclaimer">
        Mode switch is simulated. No real account permissions or external access.
      </p>
    </section>
  )
}
