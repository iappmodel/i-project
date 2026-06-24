import { useMemo } from 'react'
import {
  ELO_CONTEXT_CARDS,
  ELO_MODES,
  ELO_PROMPTS,
  buildEloResponse,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorEloOverlayView() {
  const {
    state,
    goView,
    setPresenterStep,
    setEloMode,
    selectEloPrompt,
    openACoins,
    openPOPLive,
    openCampaignPreview,
    openCreatorDashboard,
  } = useInvestorDemo()

  const { eloMode, selectedEloPrompt, walletBalance, usableBalance } = state

  const response = useMemo(
    () => buildEloResponse(selectedEloPrompt, eloMode, walletBalance, usableBalance),
    [selectedEloPrompt, eloMode, walletBalance, usableBalance],
  )

  const handleBack = () => {
    setPresenterStep(1)
    goView('feed')
  }

  const openWallet = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  return (
    <div className="id-elo">
      <div className="id-elo__scroll">
        <button type="button" className="id-elo__back" onClick={handleBack}>
          <span className="id-elo__back-icon" aria-hidden>←</span>
          Feed
        </button>

        <header className="id-elo__header">
          <div className="id-elo__membrane" aria-hidden>
            <span className="id-elo__membrane-glow" />
            <span className="id-elo__membrane-face" />
            <span className="id-elo__membrane-ring" />
          </div>
          <div className="id-elo__header-copy">
            <h1 className="id-elo__title">ELO</h1>
            <p className="id-elo__sub">Intelligent assistant layer</p>
          </div>
        </header>

        <section className="id-elo__modes">
          <p className="id-elo__panel-title">Assistant mode</p>
          <div className="id-elo__mode-row">
            {ELO_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`id-elo__mode-btn${eloMode === mode.id ? ' active' : ''}`}
                onClick={() => setEloMode(mode.id)}
              >
                <span className="id-elo__mode-label">{mode.label}</span>
                <span className="id-elo__mode-sub">{mode.sub}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="id-elo__prompts">
          <p className="id-elo__panel-title">Prompt cards</p>
          <div className="id-elo__prompt-grid">
            {ELO_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className={`id-elo__prompt-card${selectedEloPrompt === prompt.id ? ' active' : ''}`}
                onClick={() => selectEloPrompt(prompt.id)}
              >
                <span className="id-elo__prompt-label">{prompt.label}</span>
                <span className="id-elo__prompt-sub">{prompt.sub}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="id-elo__conversation" aria-live="polite">
          <p className="id-elo__panel-title">Conversation preview</p>
          <div className="id-elo__response-card">
            <div className="id-elo__response-head">
              <span className="id-elo__response-badge">Simulated guidance</span>
              <span className="id-elo__response-mode">{eloMode} mode</span>
            </div>
            <h2 className="id-elo__response-title">{response.title}</h2>
            <p className="id-elo__response-body">{response.body}</p>
            <ul className="id-elo__response-bullets">
              {response.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className="id-elo__response-tags">
              {response.contextTags.map((tag) => (
                <span key={tag} className="id-elo__tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="id-elo__context">
          <p className="id-elo__panel-title">Context cards</p>
          <div className="id-elo__context-grid">
            {ELO_CONTEXT_CARDS.map((card) => (
              <div key={card.id} className="id-elo__context-card">
                <span className="id-elo__context-label">{card.label}</span>
                <span className="id-elo__context-sub">{card.sub}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="id-elo__routes">
          <p className="id-elo__panel-title">Route preview</p>
          <div className="id-elo__route-row">
            <button type="button" className="id-elo__route-btn" onClick={openWallet}>
              Wallet
            </button>
            <button type="button" className="id-elo__route-btn" onClick={openPOPLive}>
              POP Live
            </button>
            <button type="button" className="id-elo__route-btn" onClick={openACoins}>
              ACoins
            </button>
            <button type="button" className="id-elo__route-btn" onClick={openCampaignPreview}>
              Campaign Builder
            </button>
            <button type="button" className="id-elo__route-btn" onClick={openCreatorDashboard}>
              Creator Dashboard
            </button>
          </div>
        </section>

        <p className="id-elo__disclaimer">
          Simulated assistant preview. No live AI call or external data access.
        </p>
      </div>
    </div>
  )
}
