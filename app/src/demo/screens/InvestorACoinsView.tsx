import { useMemo } from 'react'
import {
  ACOINS_FLOW_STEPS,
  ACOINS_RULES,
  ACOINS_TABS,
  ALPHABET_UNITS,
  acoinsLedgerPreview,
  computeACoinsSummary,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvestorACoinsView() {
  const {
    state,
    goView,
    openConvert,
    setACoinsTab,
    selectAlphabetUnit,
  } = useInvestorDemo()

  const {
    walletBalance,
    usableBalance,
    lifetimeEarned,
    transactions,
    selectedACoinsTab,
    selectedAlphabetUnit,
  } = state

  const summary = useMemo(
    () => computeACoinsSummary(walletBalance, usableBalance, lifetimeEarned),
    [walletBalance, usableBalance, lifetimeEarned],
  )

  const ledger = useMemo(() => acoinsLedgerPreview(transactions), [transactions])

  const selectedUnit = ALPHABET_UNITS.find((u) => u.id === selectedAlphabetUnit) ?? ALPHABET_UNITS[0]

  const handleBack = () => goView('wallet')

  return (
    <div className="id-acoins">
      <div className="id-acoins__scroll">
        <button type="button" className="id-acoins__back" onClick={handleBack}>
          <span className="id-acoins__back-icon" aria-hidden>←</span>
          Wallet
        </button>

        <header className="id-acoins__header">
          <h1 className="id-acoins__title">ACoins</h1>
          <p className="id-acoins__sub">Alphabet Currency for verified attention</p>
        </header>

        <div className="id-acoins__summary">
          <div className="id-acoins__summary-cell">
            <span className="id-acoins__summary-key">Verified attention</span>
            <span className="id-acoins__summary-val mono">{fmt(summary.verifiedAttention)}</span>
          </div>
          <div className="id-acoins__summary-cell">
            <span className="id-acoins__summary-key">ACoins earned</span>
            <span className="id-acoins__summary-val mono">{fmt(summary.acoinsEarned)}</span>
          </div>
          <div className="id-acoins__summary-cell">
            <span className="id-acoins__summary-key">iCoins available</span>
            <span className="id-acoins__summary-val mono">{fmt(summary.icoinsAvailable)}</span>
          </div>
          <div className="id-acoins__summary-cell highlight">
            <span className="id-acoins__summary-key">Usable balance</span>
            <span className="id-acoins__summary-val mono">{fmt(summary.usableBalance)}</span>
          </div>
        </div>

        <div className="id-acoins__tabs">
          {ACOINS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`id-acoins__tab${selectedACoinsTab === tab.id ? ' active' : ''}`}
              onClick={() => setACoinsTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedACoinsTab === 'overview' ? (
          <section className="id-acoins__panel">
            <p className="id-acoins__panel-title">Alphabet currency</p>
            <div className="id-acoins__alphabet">
              {ALPHABET_UNITS.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  className={`id-acoins__unit${selectedAlphabetUnit === unit.id ? ' active' : ''}`}
                  onClick={() => selectAlphabetUnit(unit.id)}
                  style={
                    selectedAlphabetUnit === unit.id
                      ? { borderColor: `${unit.color}66`, background: `${unit.color}14` }
                      : undefined
                  }
                >
                  <span className="id-acoins__unit-letter" style={{ color: unit.color }}>
                    {unit.letter}
                  </span>
                  <span className="id-acoins__unit-name">{unit.name}</span>
                </button>
              ))}
            </div>
            <div className="id-acoins__unit-detail">
              <p className="id-acoins__unit-detail-title">
                <span style={{ color: selectedUnit.color }}>{selectedUnit.letter}</span>
                {' · '}
                {selectedUnit.name}
              </p>
              <p className="id-acoins__unit-detail-body">{selectedUnit.description}</p>
            </div>
          </section>
        ) : null}

        {selectedACoinsTab === 'flow' ? (
          <section className="id-acoins__panel">
            <p className="id-acoins__panel-title">Value flow · simulated</p>
            <div className="id-acoins__flow">
              {ACOINS_FLOW_STEPS.map((step, index) => (
                <div key={step.label} className="id-acoins__flow-step">
                  <div className="id-acoins__flow-icon" aria-hidden>{step.icon}</div>
                  <div className="id-acoins__flow-text">
                    <p className="id-acoins__flow-label">{step.label}</p>
                    <p className="id-acoins__flow-sub">{step.sub}</p>
                  </div>
                  {index < ACOINS_FLOW_STEPS.length - 1 ? (
                    <span className="id-acoins__flow-arrow" aria-hidden>↓</span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {selectedACoinsTab === 'ledger' ? (
          <section className="id-acoins__panel">
            <p className="id-acoins__panel-title">Ledger preview</p>
            <div className="id-acoins__ledger">
              {ledger.map((row) => (
                <div
                  key={row.id}
                  className={`id-acoins__ledger-row${row.kind === 'empty' ? ' empty' : ''}`}
                >
                  <span className="id-acoins__ledger-label">{row.label}</span>
                  <span className="id-acoins__ledger-meta">
                    <span className="id-acoins__ledger-time">{row.timeLabel}</span>
                    <span
                      className={`id-acoins__ledger-amt mono${
                        row.kind === 'positive'
                          ? ' positive'
                          : row.kind === 'negative'
                            ? ' negative'
                            : row.kind === 'neutral'
                              ? ' neutral'
                              : ''
                      }`}
                    >
                      {row.amountDisplay}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {selectedACoinsTab === 'rules' ? (
          <section className="id-acoins__panel">
            <p className="id-acoins__panel-title">Demo rules</p>
            <ul className="id-acoins__rules">
              {ACOINS_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="id-acoins__actions">
          <button type="button" className="id-acoins__btn id-acoins__btn--primary" onClick={openConvert}>
            Convert value
          </button>
          <button type="button" className="id-acoins__btn" onClick={handleBack}>
            Back to Wallet
          </button>
        </div>

        <p className="id-acoins__disclaimer">
          Simulated value system. No real currency, token, blockchain, or exchange.
        </p>
      </div>
    </div>
  )
}
