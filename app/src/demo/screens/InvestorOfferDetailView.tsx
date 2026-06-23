import { FEED_ITEMS } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorOfferDetailView() {
  const { state, goView, startVerification, setPresenterStep } = useInvestorDemo()

  const item = FEED_ITEMS.find((f) => f.id === state.selectedOfferId) ?? FEED_ITEMS[1]

  const handleBack = () => {
    goView('feed')
    setPresenterStep(1)
  }

  const handleStartWatching = () => {
    startVerification() // resets gates + sets view to watchVerify
    setPresenterStep(3)
  }

  return (
    <div className="id-offer">
      {/* Hero */}
      <div className="id-offer__hero" style={{ background: item.bgGradient }}>
        <div className="id-offer__hero-scrim" aria-hidden />
        <div className="id-offer__brand-row">
          <div
            className="id-offer__avatar"
            style={{ background: `${item.avatarColor}20`, color: item.avatarColor }}
            aria-hidden
          >
            {item.avatarInitials}
          </div>
          <div>
            <p className="id-offer__brand-name">{item.brand}</p>
            <p className="id-offer__creator-handle">{item.creatorHandle}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="id-offer__body">
        <button
          type="button"
          className="id-offer__back"
          onClick={handleBack}
          aria-label="Back to feed"
        >
          ← Back to feed
        </button>

        {/* Reward card */}
        <div className="id-offer__reward-card">
          <div>
            <p className="id-offer__reward-label">Your reward</p>
            <p className="id-offer__reward-amount">
              {item.rewardAmount?.toFixed(2) ?? '0.25'}
            </p>
            <p className="id-offer__reward-sub">iCoins · simulated</p>
          </div>
          <div className="id-offer__duration-pill">
            <span>⏱</span>
            <span>{item.duration ?? 8}s</span>
          </div>
        </div>

        {/* Requirements */}
        <div>
          <p className="id-offer__section-title">Requirements</p>
          <ul className="id-offer__req-list">
            {item.requirements.map((req, i) => (
              <li key={i} className="id-offer__req-item">
                <span className="id-offer__req-check">✓</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Why verification matters */}
        <div className="id-offer__why">
          <p className="id-offer__why-title">Why verification matters</p>
          <p className="id-offer__why-body">
            [ i ] uses Proof of Presence (POP) — 5 attention gates that confirm
            you genuinely watched. Only verified attention is rewarded.
            This protects advertisers and ensures every iCoin you earn is
            backed by real engagement.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          className="id-offer__cta"
          onClick={handleStartWatching}
        >
          Start Watching →
        </button>
      </div>
    </div>
  )
}
