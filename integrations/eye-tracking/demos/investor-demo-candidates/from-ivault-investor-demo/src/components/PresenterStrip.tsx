import { presenterFlowLegendShort } from '../demo/screensOrder'
import { useDemo } from '../demo/useDemo'

export function PresenterStrip() {
  const demo = useDemo()

  return (
    <aside className="presenter-strip" aria-label="Demo presenter controls">
      <p className="presenter-flow-legend mono-muted" aria-hidden>
        Next path: {presenterFlowLegendShort()}
      </p>
      <div className="presenter-row presenter-row--main">
        <button type="button" className="presenter-btn" onClick={() => demo.resetDemo()}>
          Reset demo
        </button>
        <button type="button" className="presenter-btn" onClick={() => demo.goPrev()}>
          Previous
        </button>
        <button type="button" className="presenter-btn presenter-btn--accent" onClick={() => demo.goNext()}>
          Next
        </button>
      </div>
      <div className="presenter-row presenter-row--jump">
        <span className="presenter-label">Jump to:</span>
        <button type="button" className="presenter-chip" onClick={() => demo.jumpFeed()}>
          Feed
        </button>
        <button type="button" className="presenter-chip" onClick={() => demo.jumpWatch()}>
          Watch
        </button>
        <button type="button" className="presenter-chip" onClick={() => demo.jumpWallet()}>
          Wallet
        </button>
        <button type="button" className="presenter-chip" onClick={() => demo.jumpEconomics()}>
          Economics
        </button>
        <button type="button" className="presenter-chip" onClick={() => demo.jumpRoadmap()}>
          Roadmap
        </button>
      </div>
    </aside>
  )
}
