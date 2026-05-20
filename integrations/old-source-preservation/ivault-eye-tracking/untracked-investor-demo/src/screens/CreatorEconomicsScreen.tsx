import { PhoneFrame } from '../components/PhoneFrame'
import { BackRow } from '../components/BackRow'
import { useDemo } from '../demo/useDemo'

export function CreatorEconomicsScreen() {
  const { setScreen } = useDemo()

  return (
    <PhoneFrame scroll>
      <BackRow label="Home" onBack={() => setScreen('feed')} />
      <header>
        <h1 className="screen-title">Economics</h1>
        <p className="screen-sub">Attention marketplace · creator + brand equilibrium</p>
      </header>

      <article className="eco-card neu-surface">
        <header className="eco-hdr">
          <span>Novelty index</span>
          <strong className="mono ic">Δ +18%</strong>
        </header>
        <p className="eco-body">
          Verified attention routes budget to reachable creators instead of probabilistic guesses.
          Brands buy outcomes; viewers earn deterministic micro-rewards.
        </p>
      </article>

      <div className="split-block">
        <div className="split-hdr">
          <span>Creator pool</span>
          <strong className="mono-slab">72%</strong>
        </div>
        <div className="split-bar">
          <div className="split-fill teal" style={{ width: '72%' }} />
        </div>

        <div className="split-hdr spacer-top">
          <span>Audience vault</span>
          <strong className="mono-slab ic">58%</strong>
        </div>
        <div className="split-bar">
          <div className="split-fill lime" style={{ width: '58%' }} />
        </div>

        <div className="split-hdr spacer-top">
          <span>Infrastructure amortization</span>
          <strong className="mono-slab amber-pct">12%</strong>
        </div>
        <div className="split-bar">
          <div className="split-fill amber" style={{ width: '12%' }} />
        </div>
      </div>

      <div className="eco-footnote mono-muted">
        Numbers mirror qualitative mix from prototypes — illustrative only for investors.
      </div>
    </PhoneFrame>
  )
}
