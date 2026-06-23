import { FEED_ITEMS } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

// Deterministic particle positions (no random, no runtime Math.random in render)
const PARTICLES = [
  { left: '20%', top: '45%', delay: '0s' },
  { left: '35%', top: '50%', delay: '0.1s' },
  { left: '50%', top: '42%', delay: '0.18s' },
  { left: '65%', top: '48%', delay: '0.08s' },
  { left: '75%', top: '44%', delay: '0.24s' },
  { left: '28%', top: '55%', delay: '0.14s' },
  { left: '60%', top: '52%', delay: '0.3s' },
  { left: '42%', top: '58%', delay: '0.05s' },
]

export function InvestorRewardRevealView() {
  const { state, goView, setPresenterStep } = useInvestorDemo()

  const item = FEED_ITEMS.find((f) => f.id === state.selectedOfferId) ?? FEED_ITEMS[1]
  const rewardAmount = item.rewardAmount ?? 0.25

  const handleViewWallet = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  return (
    <div className="id-reward" style={{ position: 'relative' }}>
      {/* Coin particles */}
      <div className="id-reward__particles" aria-hidden>
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="id-reward__particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Central orb */}
      <div className="id-reward__orb" aria-hidden>
        <span className="id-reward__coin">◎</span>
      </div>

      {/* Amount */}
      <p className="id-reward__amount">
        +{rewardAmount.toFixed(2)}
      </p>
      <p className="id-reward__currency">iCoins · verified</p>

      {/* Headline + copy */}
      <p className="id-reward__headline">Attention verified.</p>
      <p className="id-reward__copy">
        Verified attention converted into wallet value.
        Your balance has been updated.
      </p>

      {/* CTA */}
      <button
        type="button"
        className="id-reward__cta"
        onClick={handleViewWallet}
      >
        View Wallet →
      </button>
    </div>
  )
}
