import {
  DEFAULT_DEMO_OFFER_ID,
  THREE_LOOPS,
  THREE_LOOPS_SHARED_LAYER,
  THREE_LOOPS_SYSTEM_SUMMARY,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorThreeLoopsView() {
  const {
    state,
    goView,
    setPresenterStep,
    setSelectedLoop,
    selectOffer,
    openPromo,
    openCampaignPreview,
    openUnifiedProfile,
    openPOPLive,
    openACoins,
  } = useInvestorDemo()

  const { selectedLoopId } = state
  const selectedLoop = THREE_LOOPS.find((l) => l.id === selectedLoopId) ?? THREE_LOOPS[0]

  const handleBack = () => {
    setPresenterStep(1)
    goView('feed')
  }

  const handleLoopCta = () => {
    if (selectedLoopId === 'watch') {
      selectOffer(DEFAULT_DEMO_OFFER_ID)
      return
    }
    if (selectedLoopId === 'igo') {
      openPromo()
      return
    }
    openCampaignPreview()
  }

  const handleSecondaryCreator = () => {
    openUnifiedProfile()
  }

  const openWallet = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  return (
    <div className="id-threeloops">
      <div className="id-threeloops__scroll">
        <button type="button" className="id-threeloops__back" onClick={handleBack}>
          <span className="id-threeloops__back-icon" aria-hidden>←</span>
          Feed
        </button>

        <header className="id-threeloops__header">
          <h1 className="id-threeloops__title">Three Loops</h1>
          <p className="id-threeloops__sub">The operating system for verified attention</p>
        </header>

        <div className="id-threeloops__summary">
          {THREE_LOOPS_SYSTEM_SUMMARY.map((cell) => (
            <div key={cell.key} className="id-threeloops__summary-cell">
              <span className="id-threeloops__summary-key">{cell.key}</span>
              <span className="id-threeloops__summary-sub">{cell.sub}</span>
            </div>
          ))}
        </div>

        <div className="id-threeloops__selector">
          {THREE_LOOPS.map((loop) => (
            <button
              key={loop.id}
              type="button"
              className={`id-threeloops__selector-btn${
                selectedLoopId === loop.id ? ' active' : ''
              }`}
              onClick={() => setSelectedLoop(loop.id)}
              style={
                selectedLoopId === loop.id
                  ? { borderColor: `${loop.accent}55`, color: loop.accent }
                  : undefined
              }
            >
              {loop.num}
            </button>
          ))}
        </div>

        <div className="id-threeloops__diagram">
          {THREE_LOOPS.map((loop) => (
            <button
              key={loop.id}
              type="button"
              className={`id-threeloops__loop-card${
                selectedLoopId === loop.id ? ' active' : ''
              }`}
              onClick={() => setSelectedLoop(loop.id)}
              style={
                selectedLoopId === loop.id
                  ? {
                      borderColor: `${loop.accent}44`,
                      boxShadow: `0 0 24px ${loop.accent}18`,
                    }
                  : undefined
              }
            >
              <span className="id-threeloops__loop-num" style={{ color: loop.accent }}>
                {loop.num}
              </span>
              <span className="id-threeloops__loop-name">{loop.name}</span>
              <span className="id-threeloops__loop-tag">{loop.tag}</span>
            </button>
          ))}

          <div className="id-threeloops__hub" aria-label="Shared system layer">
            <p className="id-threeloops__hub-title">Shared layer</p>
            {THREE_LOOPS_SHARED_LAYER.map((node) => (
              <div key={node.id} className="id-threeloops__hub-node">
                <span className="id-threeloops__hub-label">{node.label}</span>
                <span className="id-threeloops__hub-sub">{node.sub}</span>
              </div>
            ))}
          </div>
        </div>

        <section className="id-threeloops__detail">
          <p className="id-threeloops__panel-title">Loop detail · simulated preview</p>
          <div
            className="id-threeloops__detail-header"
            style={{ borderColor: `${selectedLoop.accent}33` }}
          >
            <span className="id-threeloops__detail-num" style={{ color: selectedLoop.accent }}>
              {selectedLoop.num}
            </span>
            <div>
              <p className="id-threeloops__detail-name">{selectedLoop.name}</p>
              <p className="id-threeloops__detail-tag">{selectedLoop.tag}</p>
            </div>
          </div>

          <div className="id-threeloops__detail-grid">
            <div className="id-threeloops__detail-cell">
              <span className="id-threeloops__detail-key">Source</span>
              <span className="id-threeloops__detail-val">{selectedLoop.source}</span>
            </div>
            <div className="id-threeloops__detail-cell">
              <span className="id-threeloops__detail-key">Proof</span>
              <span className="id-threeloops__detail-val">{selectedLoop.proof}</span>
            </div>
            <div className="id-threeloops__detail-cell">
              <span className="id-threeloops__detail-key">Reward</span>
              <span className="id-threeloops__detail-val">{selectedLoop.reward}</span>
            </div>
          </div>

          <ol className="id-threeloops__steps">
            {selectedLoop.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <p className="id-threeloops__outcome" style={{ color: selectedLoop.accent }}>
            {selectedLoop.outcome}
          </p>

          <div className="id-threeloops__connections">
            <div className="id-threeloops__connection">
              <span className="id-threeloops__connection-key">POP</span>
              <span className="id-threeloops__connection-val">{selectedLoop.popLink}</span>
            </div>
            <div className="id-threeloops__connection">
              <span className="id-threeloops__connection-key">ACoins</span>
              <span className="id-threeloops__connection-val">{selectedLoop.acoinsLink}</span>
            </div>
            <div className="id-threeloops__connection">
              <span className="id-threeloops__connection-key">Wallet</span>
              <span className="id-threeloops__connection-val">{selectedLoop.walletLink}</span>
            </div>
          </div>

          <div className="id-threeloops__detail-actions">
            <button
              type="button"
              className="id-threeloops__btn id-threeloops__btn--primary"
              style={{
                background: `linear-gradient(135deg, ${selectedLoop.accent}33 0%, ${selectedLoop.accent}22 100%)`,
                borderColor: `${selectedLoop.accent}55`,
              }}
              onClick={handleLoopCta}
            >
              {selectedLoop.cta}
            </button>
            {selectedLoopId === 'creator' ? (
              <button type="button" className="id-threeloops__btn" onClick={handleSecondaryCreator}>
                Open unified profile
              </button>
            ) : null}
          </div>
        </section>

        <section className="id-threeloops__routes">
          <p className="id-threeloops__panel-title">Quick routes</p>
          <div className="id-threeloops__route-row">
            <button type="button" className="id-threeloops__route-btn" onClick={openPOPLive}>
              POP Live
            </button>
            <button type="button" className="id-threeloops__route-btn" onClick={openACoins}>
              ACoins
            </button>
            <button type="button" className="id-threeloops__route-btn" onClick={openWallet}>
              Wallet
            </button>
          </div>
        </section>

        <p className="id-threeloops__disclaimer">
          System overview uses simulated flows. No real financial movement, GPS, or external
          platform access.
        </p>
      </div>
    </div>
  )
}
