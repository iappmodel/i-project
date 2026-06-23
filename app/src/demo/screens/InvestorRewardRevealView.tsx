import { FEED_ITEMS } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

const PARTICLES = [
  { left: '18%', top: '38%', delay: '0s', size: 7 },
  { left: '32%', top: '44%', delay: '0.12s', size: 5 },
  { left: '48%', top: '36%', delay: '0.2s', size: 8 },
  { left: '62%', top: '42%', delay: '0.08s', size: 6 },
  { left: '72%', top: '40%', delay: '0.28s', size: 5 },
  { left: '26%', top: '52%', delay: '0.16s', size: 4 },
  { left: '58%', top: '50%', delay: '0.34s', size: 6 },
  { left: '44%', top: '54%', delay: '0.06s', size: 5 },
  { left: '54%', top: '32%', delay: '0.22s', size: 4 },
  { left: '38%', top: '48%', delay: '0.18s', size: 7 },
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
    <div className="id-reward">
      <div className="id-reward__glow" aria-hidden />

      <div className="id-reward__particles" aria-hidden>
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="id-reward__particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      <div className="id-reward__orb" aria-hidden>
        <div className="id-reward__orb-ring" />
        <span className="id-reward__coin">◎</span>
      </div>

      <p className="id-reward__eyebrow">Verified reward</p>

      <p className="id-reward__amount">
        +{rewardAmount.toFixed(2)}
      </p>
      <p className="id-reward__currency">iCoins · simulated</p>

      <p className="id-reward__headline">Verified attention converted into wallet value.</p>
      <p className="id-reward__copy">
        Your demo balance has been updated. No real money moved.
      </p>

      <button type="button" className="id-reward__cta" onClick={handleViewWallet}>
        View Wallet →
      </button>
    </div>
  )
}
