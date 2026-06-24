import { useMemo } from 'react'
import {
  BRAND_DASHBOARD_OWNER,
  BRAND_DASHBOARD_TABS,
  computeBrandDashboardSnapshot,
  campaignActionLabel,
  type CampaignAction,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorDock } from '../components/InvestorDock'

function fmt(n: number, digits = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function fmtViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

function pct(n: number) {
  return `${Math.round(n)}%`
}

export function InvestorBrandDashboardView() {
  const {
    state,
    setPresenterStep,
    openCampaignPreview,
    openPOPLive,
    openThreeLoops,
    openCreatorDashboard,
    setBrandDashboardTab,
    setBrandCta,
  } = useInvestorDemo()

  const { campaign, studio, brandDashboardTab, selectedBrandCta } = state

  const snapshot = useMemo(
    () => computeBrandDashboardSnapshot(campaign, studio, selectedBrandCta),
    [campaign, studio, selectedBrandCta],
  )

  const headerCtaLabel = campaignActionLabel(
    campaign.selectedAction,
    campaign.customActionLabel,
  )

  const handleBack = () => openCampaignPreview()

  const handleCtaTap = (cta: CampaignAction) => {
    setBrandCta(cta)
  }

  const openPopLive = () => {
    setPresenterStep(2)
    openPOPLive()
  }

  const openLoops = () => {
    setPresenterStep(1)
    openThreeLoops()
  }

  const spendPct = Math.round(
    (snapshot.rewardPool.spentPreview / Math.max(snapshot.rewardPool.budgetCap, 1)) * 100,
  )

  return (
    <div className="id-branddash">
      <div className="id-branddash__scroll">
        <button type="button" className="id-branddash__back" onClick={handleBack}>
          <span className="id-branddash__back-icon" aria-hidden>←</span>
          Campaign Builder
        </button>

        <header className="id-branddash__header">
          <div className="id-branddash__brand-mark" aria-hidden>◈</div>
          <div className="id-branddash__header-text">
            <h1 className="id-branddash__title">Owner Analytics</h1>
            <p className="id-branddash__sub">Verified outcomes for campaign owners</p>
          </div>
        </header>

        <section className="id-branddash__campaign-card">
          <div className="id-branddash__campaign-top">
            <div>
              <p className="id-branddash__brand-name">{BRAND_DASHBOARD_OWNER.brandName}</p>
              <p className="id-branddash__campaign-title">{BRAND_DASHBOARD_OWNER.campaignTitle}</p>
            </div>
            <span
              className={`id-branddash__status${
                campaign.campaignStatus === 'published' ? ' published' : ''
              }`}
            >
              {snapshot.statusLabel}
            </span>
          </div>
          <div className="id-branddash__campaign-meta">
            <div className="id-branddash__meta-cell">
              <span className="id-branddash__meta-key">CTA</span>
              <span className="id-branddash__meta-val">{headerCtaLabel}</span>
            </div>
            <div className="id-branddash__meta-cell">
              <span className="id-branddash__meta-key">Reward</span>
              <span className="id-branddash__meta-val mono">
                {snapshot.selectedReward.toFixed(2)} iC
              </span>
            </div>
            <div className="id-branddash__meta-cell">
              <span className="id-branddash__meta-key">Strictness</span>
              <span className="id-branddash__meta-val">{campaign.verificationStrictness}</span>
            </div>
          </div>
        </section>

        <div className="id-branddash__tabs">
          {BRAND_DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`id-branddash__tab${brandDashboardTab === tab.id ? ' active' : ''}`}
              onClick={() => setBrandDashboardTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {brandDashboardTab === 'overview' ? (
          <>
            <div className="id-branddash__kpis">
              <div className="id-branddash__kpi">
                <span className="id-branddash__kpi-key">Verified views</span>
                <span className="id-branddash__kpi-val">{fmtViews(snapshot.kpis.verifiedViews)}</span>
              </div>
              <div className="id-branddash__kpi">
                <span className="id-branddash__kpi-key">Pool remaining</span>
                <span className="id-branddash__kpi-val mono">
                  {fmt(snapshot.kpis.rewardPoolRemaining)} iC
                </span>
              </div>
              <div className="id-branddash__kpi">
                <span className="id-branddash__kpi-key">Cost / verified</span>
                <span className="id-branddash__kpi-val mono">
                  {fmt(snapshot.kpis.costPerVerifiedAttention, 3)} iC
                </span>
              </div>
              <div className="id-branddash__kpi">
                <span className="id-branddash__kpi-key">CTA completion</span>
                <span className="id-branddash__kpi-val">{pct(snapshot.kpis.ctaCompletionRate)}</span>
              </div>
              <div className="id-branddash__kpi">
                <span className="id-branddash__kpi-key">Fraud prevented</span>
                <span className="id-branddash__kpi-val">{snapshot.kpis.fraudPrevented}</span>
              </div>
              <div className="id-branddash__kpi highlight">
                <span className="id-branddash__kpi-key">Est. reach</span>
                <span className="id-branddash__kpi-val">{fmtViews(snapshot.kpis.estimatedReach)}</span>
              </div>
            </div>

            <section className="id-branddash__panel">
              <p className="id-branddash__panel-title">Reward pool · preview</p>
              <div className="id-branddash__pool-bar">
                <span style={{ width: `${spendPct}%` }} />
              </div>
              <div className="id-branddash__pool-grid">
                <div className="id-branddash__pool-cell">
                  <span className="id-branddash__pool-key">Budget cap</span>
                  <span className="id-branddash__pool-val mono">
                    {fmt(snapshot.rewardPool.budgetCap)} iC
                  </span>
                </div>
                <div className="id-branddash__pool-cell">
                  <span className="id-branddash__pool-key">Spent preview</span>
                  <span className="id-branddash__pool-val mono">
                    {fmt(snapshot.rewardPool.spentPreview)} iC
                  </span>
                </div>
                <div className="id-branddash__pool-cell highlight">
                  <span className="id-branddash__pool-key">Remaining</span>
                  <span className="id-branddash__pool-val mono">
                    {fmt(snapshot.rewardPool.remainingPreview)} iC
                  </span>
                </div>
              </div>
            </section>

            <section className="id-branddash__panel">
              <p className="id-branddash__panel-title">CTA performance · simulated</p>
              <div className="id-branddash__cta-list">
                {snapshot.ctaPerformance.map((row) => {
                  const selected = selectedBrandCta === row.id
                  return (
                    <button
                      key={row.id}
                      type="button"
                      className={`id-branddash__cta-row${selected ? ' active' : ''}`}
                      onClick={() => handleCtaTap(row.id)}
                    >
                      <span
                        className="id-branddash__cta-dot"
                        style={{ background: row.color }}
                        aria-hidden
                      />
                      <span className="id-branddash__cta-label">{row.label}</span>
                      <span className="id-branddash__cta-rate">{pct(row.completionRate)}</span>
                      {selected ? (
                        <span className="id-branddash__cta-badge">Campaign CTA</span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="id-branddash__panel">
              <p className="id-branddash__panel-title">Campaign timeline · preview</p>
              <div className="id-branddash__timeline">
                {snapshot.timeline.map((step) => (
                  <div
                    key={step.id}
                    className={`id-branddash__timeline-step ${step.status}`}
                  >
                    <span className="id-branddash__timeline-dot" aria-hidden />
                    <div className="id-branddash__timeline-text">
                      <span className="id-branddash__timeline-label">{step.label}</span>
                      <span className="id-branddash__timeline-sub">{step.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {brandDashboardTab === 'pop' ? (
          <section className="id-branddash__panel">
            <p className="id-branddash__panel-title">POP quality · proof-of-presence preview</p>
            <div className="id-branddash__pop-grid">
              <div className="id-branddash__pop-cell">
                <span className="id-branddash__pop-key">Session integrity</span>
                <span className="id-branddash__pop-val">{pct(snapshot.popQuality.sessionIntegrity)}</span>
                <div className="id-branddash__pop-bar">
                  <span style={{ width: `${snapshot.popQuality.sessionIntegrity}%` }} />
                </div>
              </div>
              <div className="id-branddash__pop-cell">
                <span className="id-branddash__pop-key">Attention confidence</span>
                <span className="id-branddash__pop-val">{pct(snapshot.popQuality.attentionConfidence)}</span>
                <div className="id-branddash__pop-bar">
                  <span style={{ width: `${snapshot.popQuality.attentionConfidence}%` }} />
                </div>
              </div>
              <div className="id-branddash__pop-cell">
                <span className="id-branddash__pop-key">Drift recovered</span>
                <span className="id-branddash__pop-val">{pct(snapshot.popQuality.driftRecovered)}</span>
                <div className="id-branddash__pop-bar">
                  <span style={{ width: `${snapshot.popQuality.driftRecovered}%` }} />
                </div>
              </div>
              <div className="id-branddash__pop-cell highlight">
                <span className="id-branddash__pop-key">Fraud screen passed</span>
                <span className="id-branddash__pop-val">{pct(snapshot.popQuality.fraudScreenPassed)}</span>
                <div className="id-branddash__pop-bar accent">
                  <span style={{ width: `${snapshot.popQuality.fraudScreenPassed}%` }} />
                </div>
              </div>
            </div>
            <p className="id-branddash__panel-note">
              Scores reflect selected verification gates and strictness · simulated only
            </p>
          </section>
        ) : null}

        {brandDashboardTab === 'audience' ? (
          <section className="id-branddash__panel">
            <p className="id-branddash__panel-title">Audience snapshot · simulated segments</p>
            <div className="id-branddash__audience">
              {snapshot.audience.map((seg) => (
                <div key={seg.id} className="id-branddash__audience-row">
                  <div className="id-branddash__audience-text">
                    <span className="id-branddash__audience-label">{seg.label}</span>
                    <span className="id-branddash__audience-sub">{seg.sub}</span>
                  </div>
                  <div className="id-branddash__audience-bar-wrap">
                    <div className="id-branddash__audience-bar">
                      <span style={{ width: `${seg.sharePct}%` }} />
                    </div>
                    <span className="id-branddash__audience-pct">{seg.sharePct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="id-branddash__panel-note">
              No real audience targeting or ad network delivery in this preview
            </p>
          </section>
        ) : null}

        {brandDashboardTab === 'spend' ? (
          <section className="id-branddash__panel">
            <p className="id-branddash__panel-title">Spend breakdown · reward pool preview</p>
            <div className="id-branddash__spend-summary">
              <div className="id-branddash__spend-row">
                <span>Budget cap</span>
                <span className="mono">{fmt(snapshot.rewardPool.budgetCap)} iC</span>
              </div>
              <div className="id-branddash__spend-row">
                <span>Spent preview</span>
                <span className="mono">{fmt(snapshot.rewardPool.spentPreview)} iC</span>
              </div>
              <div className="id-branddash__spend-row highlight">
                <span>Remaining preview</span>
                <span className="mono">{fmt(snapshot.rewardPool.remainingPreview)} iC</span>
              </div>
            </div>
            <p className="id-branddash__panel-sub">Per verified attention · estimated split</p>
            <div className="id-branddash__spend-split">
              <div className="id-branddash__spend-cell">
                <span className="id-branddash__spend-key">Viewer rewards</span>
                <span className="id-branddash__spend-val mono">
                  {fmt(snapshot.rewardPool.viewerRewards)} iC
                </span>
              </div>
              <div className="id-branddash__spend-cell">
                <span className="id-branddash__spend-key">Creator / share</span>
                <span className="id-branddash__spend-val mono">
                  {fmt(snapshot.rewardPool.creatorShare)} iC
                </span>
              </div>
              <div className="id-branddash__spend-cell">
                <span className="id-branddash__spend-key">Platform fee</span>
                <span className="id-branddash__spend-val mono">
                  {fmt(snapshot.rewardPool.platformFee)} iC
                </span>
              </div>
            </div>
            <p className="id-branddash__panel-note">
              Owner analytics preview — not actual ad spend or payment reporting
            </p>
          </section>
        ) : null}

        <section className="id-branddash__routes">
          <p className="id-branddash__panel-title">Related previews</p>
          <div className="id-branddash__route-row">
            <button type="button" className="id-branddash__route-btn" onClick={openCampaignPreview}>
              Open Campaign Builder
            </button>
            <button type="button" className="id-branddash__route-btn" onClick={openPopLive}>
              Open POP Live
            </button>
          </div>
          <div className="id-branddash__route-row">
            <button type="button" className="id-branddash__route-btn" onClick={openLoops}>
              Open Three Loops
            </button>
            <button type="button" className="id-branddash__route-btn" onClick={openCreatorDashboard}>
              Open Creator Dashboard
            </button>
          </div>
        </section>

        <p className="id-branddash__disclaimer">
          Simulated owner analytics. No real ad network, payment, audience, or campaign reporting.
        </p>
      </div>

      <InvestorDock />
    </div>
  )
}
