import { useMemo } from 'react'
import {
  ANALYTICS_INSIGHTS,
  ANALYTICS_RANGES,
  ANALYTICS_VIEWS,
  analyticsInsightById,
  computeAttentionAnalyticsSnapshot,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorAttentionAnalyticsView() {
  const {
    state,
    goView,
    setPresenterStep,
    setAnalyticsView,
    setAnalyticsRange,
    selectAnalyticsInsight,
    openPOPLive,
    openThreeLoops,
    openCreatorDashboard,
    openBrandDashboard,
  } = useInvestorDemo()

  const {
    analyticsView,
    analyticsRange,
    selectedAnalyticsInsight,
    walletBalance,
    sessionEarned,
    lifetimeEarned,
  } = state

  const snapshot = useMemo(
    () =>
      computeAttentionAnalyticsSnapshot({
        view: analyticsView,
        range: analyticsRange,
        walletBalance,
        sessionEarned,
        lifetimeEarned,
      }),
    [analyticsView, analyticsRange, walletBalance, sessionEarned, lifetimeEarned],
  )

  const selectedInsight = selectedAnalyticsInsight
    ? analyticsInsightById(selectedAnalyticsInsight)
    : null

  const handleBack = () => {
    goView('threeLoops')
  }

  const openWallet = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  return (
    <div className="id-analytics">
      <div className="id-analytics__scroll">
        <button type="button" className="id-analytics__back" onClick={handleBack}>
          <span className="id-analytics__back-icon" aria-hidden>←</span>
          Three Loops
        </button>

        <header className="id-analytics__header">
          <h1 className="id-analytics__title">Attention Analytics</h1>
          <p className="id-analytics__sub">Verified attention value across [ i ]</p>
        </header>

        <div className="id-analytics__filters">
          <div className="id-analytics__filter-row">
            {ANALYTICS_VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                className={`id-analytics__filter-btn${analyticsView === view.id ? ' active' : ''}`}
                onClick={() => setAnalyticsView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </div>
          <div className="id-analytics__filter-row">
            {ANALYTICS_RANGES.map((range) => (
              <button
                key={range.id}
                type="button"
                className={`id-analytics__range-btn${analyticsRange === range.id ? ' active' : ''}`}
                onClick={() => setAnalyticsRange(range.id)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <section className="id-analytics__kpis">
          <p className="id-analytics__panel-title">Top KPIs</p>
          <div className="id-analytics__kpi-grid">
            {snapshot.kpis.map((kpi) => (
              <div key={kpi.id} className="id-analytics__kpi">
                <span className="id-analytics__kpi-label">{kpi.label}</span>
                <span className="id-analytics__kpi-value">{kpi.value}</span>
                <span className="id-analytics__kpi-sub">{kpi.sub}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="id-analytics__loops">
          <p className="id-analytics__panel-title">Loop breakdown</p>
          {snapshot.loops.map((loop) => (
            <div key={loop.id} className="id-analytics__loop-row">
              <div className="id-analytics__loop-head">
                <span className="id-analytics__loop-label">{loop.label}</span>
                <span className="id-analytics__loop-rewards">{loop.rewards}</span>
              </div>
              <div className="id-analytics__loop-meta">
                <span>{loop.minutes} min · estimated</span>
                <span>POP {loop.popConfidence}% · preview</span>
              </div>
              <div className="id-analytics__loop-bar" aria-hidden>
                <span style={{ width: `${Math.min(100, loop.minutes)}%` }} />
              </div>
            </div>
          ))}
        </section>

        <section className="id-analytics__charts">
          <p className="id-analytics__panel-title">Charts & cards</p>
          <div className="id-analytics__chart-grid">
            {snapshot.charts.map((chart) => (
              <div key={chart.id} className={`id-analytics__chart id-analytics__chart--${chart.tone}`}>
                <span className="id-analytics__chart-label">{chart.label}</span>
                <span className="id-analytics__chart-value">{chart.value}</span>
                <div className="id-analytics__chart-bar" aria-hidden>
                  <span style={{ width: `${chart.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="id-analytics__insights">
          <p className="id-analytics__panel-title">Insight cards</p>
          <div className="id-analytics__insight-grid">
            {ANALYTICS_INSIGHTS.map((insight) => (
              <button
                key={insight.id}
                type="button"
                className={`id-analytics__insight${
                  selectedAnalyticsInsight === insight.id ? ' active' : ''
                }`}
                onClick={() =>
                  selectAnalyticsInsight(
                    selectedAnalyticsInsight === insight.id ? null : insight.id,
                  )
                }
              >
                <span className="id-analytics__insight-label">{insight.label}</span>
                <span className="id-analytics__insight-detail">{insight.detail}</span>
              </button>
            ))}
          </div>
          {selectedInsight ? (
            <p className="id-analytics__insight-selected">
              Selected: {selectedInsight.label} · {selectedInsight.detail}
            </p>
          ) : null}
        </section>

        <section className="id-analytics__routes">
          <p className="id-analytics__panel-title">Routes</p>
          <div className="id-analytics__route-row">
            <button type="button" className="id-analytics__route-btn" onClick={openPOPLive}>
              POP Live
            </button>
            <button type="button" className="id-analytics__route-btn" onClick={openThreeLoops}>
              Three Loops
            </button>
            <button type="button" className="id-analytics__route-btn" onClick={openWallet}>
              Wallet
            </button>
            <button type="button" className="id-analytics__route-btn" onClick={openCreatorDashboard}>
              Creator Dashboard
            </button>
            <button type="button" className="id-analytics__route-btn" onClick={openBrandDashboard}>
              Brand Dashboard
            </button>
          </div>
        </section>

        <p className="id-analytics__disclaimer">
          Simulated analytics preview. No real tracking, platform reporting, or external data access.
        </p>
      </div>
    </div>
  )
}
