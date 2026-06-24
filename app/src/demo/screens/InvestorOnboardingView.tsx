import {
  ONBOARDING_INTERESTS,
  ONBOARDING_MODES,
  ONBOARDING_PLATFORMS,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_LABELS,
  SIMULATED_ONBOARDING_WALLET_ID,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorOnboardingView() {
  const {
    state,
    goView,
    setOnboardingStep,
    setOnboardingMode,
    toggleOnboardingPlatform,
    toggleOnboardingInterest,
    finishOnboarding,
  } = useInvestorDemo()

  const {
    onboardingStep,
    onboardingMode,
    onboardingConnectedPlatforms,
    onboardingInterests,
    walletBalance,
    usableBalance,
  } = state

  const handleBack = () => {
    if (onboardingStep > 1) {
      setOnboardingStep(onboardingStep - 1)
      return
    }
    goView('splash')
  }

  const handleNext = () => {
    if (onboardingStep < ONBOARDING_STEP_COUNT) {
      setOnboardingStep(onboardingStep + 1)
    }
  }

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="id-onboarding">
      <div className="id-onboarding__scroll">
        <button type="button" className="id-onboarding__back" onClick={handleBack}>
          <span className="id-onboarding__back-icon" aria-hidden>←</span>
          {onboardingStep === 1 ? 'Splash' : 'Back'}
        </button>

        <div className="id-onboarding__progress" aria-hidden>
          {ONBOARDING_STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={`id-onboarding__progress-dot${i + 1 <= onboardingStep ? ' on' : ''}`}
              title={label}
            />
          ))}
        </div>

        <p className="id-onboarding__step-label">
          Step {onboardingStep} of {ONBOARDING_STEP_COUNT} · {ONBOARDING_STEP_LABELS[onboardingStep - 1]}
        </p>

        {onboardingStep === 1 ? (
          <section className="id-onboarding__panel">
            <div className="id-onboarding__hero-logo">[<span>i</span>]</div>
            <h1 className="id-onboarding__title">Welcome to [ i ]</h1>
            <p className="id-onboarding__sub">Your attention has value</p>
            <p className="id-onboarding__body">
              This simulated setup preview shows how someone joins [ i ], understands the attention
              wallet, and reaches their first earning opportunity — no real account or external
              access.
            </p>
          </section>
        ) : null}

        {onboardingStep === 2 ? (
          <section className="id-onboarding__panel">
            <h1 className="id-onboarding__title">Choose your mode</h1>
            <p className="id-onboarding__sub">How you&apos;ll use [ i ] in this demo</p>
            <div className="id-onboarding__mode-grid">
              {ONBOARDING_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`id-onboarding__mode-card${onboardingMode === mode.id ? ' active' : ''}`}
                  onClick={() => setOnboardingMode(mode.id)}
                >
                  <span className="id-onboarding__mode-label">{mode.label}</span>
                  <span className="id-onboarding__mode-sub">{mode.sub}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {onboardingStep === 3 ? (
          <section className="id-onboarding__panel">
            <h1 className="id-onboarding__title">Attention wallet preview</h1>
            <p className="id-onboarding__sub">Internal value layer · simulated</p>
            <div className="id-onboarding__wallet-card">
              <span className="id-onboarding__wallet-badge">Preview wallet</span>
              <p className="id-onboarding__wallet-id">{SIMULATED_ONBOARDING_WALLET_ID}</p>
              <div className="id-onboarding__wallet-balances">
                <div>
                  <span className="id-onboarding__wallet-key">Verified iCoins</span>
                  <span className="id-onboarding__wallet-val">{fmt(walletBalance)} iC</span>
                </div>
                <div>
                  <span className="id-onboarding__wallet-key">Usable preview</span>
                  <span className="id-onboarding__wallet-val">{fmt(usableBalance)} iC</span>
                </div>
              </div>
              <p className="id-onboarding__wallet-note">
                ACoins / iCoins explain how verified attention maps into typed internal currency
                previews. No real wallet or financial value is created.
              </p>
            </div>
          </section>
        ) : null}

        {onboardingStep === 4 ? (
          <section className="id-onboarding__panel">
            <h1 className="id-onboarding__title">Connect platforms</h1>
            <p className="id-onboarding__sub">Simulated toggles · no OAuth</p>
            <div className="id-onboarding__platform-grid">
              {ONBOARDING_PLATFORMS.map((platform) => {
                const on = onboardingConnectedPlatforms.includes(platform.id)
                return (
                  <button
                    key={platform.id}
                    type="button"
                    className={`id-onboarding__platform-card${on ? ' active' : ''}`}
                    onClick={() => toggleOnboardingPlatform(platform.id)}
                    aria-pressed={on}
                  >
                    <span
                      className="id-onboarding__platform-icon"
                      style={{
                        background: `${platform.color}22`,
                        borderColor: `${platform.color}55`,
                        color: platform.color,
                      }}
                    >
                      {platform.initials}
                    </span>
                    <span className="id-onboarding__platform-label">{platform.label}</span>
                    <span className="id-onboarding__platform-state">
                      {on ? 'Connected · preview' : 'Tap to connect'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {onboardingStep === 5 ? (
          <section className="id-onboarding__panel">
            <h1 className="id-onboarding__title">Choose interests</h1>
            <p className="id-onboarding__sub">Personalize your feed preview</p>
            <div className="id-onboarding__interest-grid">
              {ONBOARDING_INTERESTS.map((interest) => {
                const on = onboardingInterests.includes(interest.id)
                return (
                  <button
                    key={interest.id}
                    type="button"
                    className={`id-onboarding__interest-chip${on ? ' active' : ''}`}
                    onClick={() => toggleOnboardingInterest(interest.id)}
                    aria-pressed={on}
                  >
                    <span aria-hidden>{interest.emoji}</span>
                    {interest.label}
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {onboardingStep === 6 ? (
          <section className="id-onboarding__panel">
            <h1 className="id-onboarding__title">First earning opportunity</h1>
            <p className="id-onboarding__sub">Your setup preview is ready</p>
            <div className="id-onboarding__finish-card">
              <span className="id-onboarding__finish-mode">{onboardingMode} mode</span>
              <p className="id-onboarding__finish-copy">
                Open your first sponsored reward preview or explore wallet, platforms, and feed
                routes — all simulated.
              </p>
              <button
                type="button"
                className="id-onboarding__btn id-onboarding__btn--primary"
                onClick={() => finishOnboarding('offer')}
              >
                Open first reward
              </button>
              <div className="id-onboarding__finish-routes">
                <button type="button" className="id-onboarding__route-btn" onClick={() => finishOnboarding('feed')}>
                  Feed
                </button>
                <button type="button" className="id-onboarding__route-btn" onClick={() => finishOnboarding('wallet')}>
                  Wallet
                </button>
                <button type="button" className="id-onboarding__route-btn" onClick={() => finishOnboarding('connect')}>
                  Connect Platforms
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {onboardingStep < 6 ? (
          <div className="id-onboarding__nav">
            <button type="button" className="id-onboarding__btn" onClick={handleBack}>
              Back
            </button>
            <button
              type="button"
              className="id-onboarding__btn id-onboarding__btn--primary"
              onClick={handleNext}
            >
              Continue
            </button>
          </div>
        ) : null}

        <p className="id-onboarding__disclaimer">
          Simulated onboarding. No real account, wallet, or external platform access.
        </p>
      </div>
    </div>
  )
}
