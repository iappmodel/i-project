import { useMemo } from 'react'
import {
  CREATOR_DASHBOARD_TABS,
  computeCreatorDashboardSnapshot,
  profilePlatformMeta,
  UNIFIED_PROFILE_CONTENT,
  UNIFIED_PROFILE_CREATOR,
  type ProfilePlatformId,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

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

export function InvestorCreatorDashboardView() {
  const {
    state,
    goView,
    setPresenterStep,
    openUnifiedProfile,
    openCampaignPreview,
    openStudioPreview,
    setCreatorDashboardTab,
    setCreatorPlatformFilter,
    selectCreatorContent,
  } = useInvestorDemo()

  const {
    platformConnections,
    campaign,
    walletBalance,
    usableBalance,
    pendingBalance,
    lifetimeEarned,
    creatorDashboardTab,
    selectedCreatorPlatform,
    selectedCreatorContentId,
  } = state

  const creator = UNIFIED_PROFILE_CREATOR

  const snapshot = useMemo(
    () =>
      computeCreatorDashboardSnapshot(
        platformConnections,
        campaign,
        walletBalance,
        usableBalance,
        pendingBalance,
        lifetimeEarned,
        UNIFIED_PROFILE_CONTENT,
      ),
    [platformConnections, campaign, walletBalance, usableBalance, pendingBalance, lifetimeEarned],
  )

  const connectedCount = platformConnections.filter((p) => p.connected).length

  const filteredPlatforms =
    selectedCreatorPlatform === 'all'
      ? snapshot.platforms
      : snapshot.platforms.filter((p) => p.platformId === selectedCreatorPlatform)

  const filteredContent = snapshot.topContent.filter((item) => {
    if (selectedCreatorPlatform === 'all') return true
    return item.platformId === selectedCreatorPlatform
  })

  const handleBack = () => openUnifiedProfile()

  const handlePlatformTap = (platformId: ProfilePlatformId) => {
    setCreatorPlatformFilter(
      selectedCreatorPlatform === platformId ? 'all' : platformId,
    )
  }

  const openWallet = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  return (
    <div className="id-creatordash">
      <div className="id-creatordash__scroll">
        <button type="button" className="id-creatordash__back" onClick={handleBack}>
          <span className="id-creatordash__back-icon" aria-hidden>←</span>
          Unified Profile
        </button>

        <header className="id-creatordash__header">
          <div
            className="id-creatordash__avatar"
            style={{ background: `${creator.color}22`, color: creator.color }}
            aria-hidden
          >
            {creator.initials}
          </div>
          <div className="id-creatordash__header-text">
            <h1 className="id-creatordash__title">Creator Dashboard</h1>
            <p className="id-creatordash__sub">Monetize verified attention across platforms</p>
            <p className="id-creatordash__handle">{creator.handle}</p>
          </div>
        </header>

        <div className="id-creatordash__meta">
          <span className="id-creatordash__meta-pill">
            {connectedCount} platform{connectedCount === 1 ? '' : 's'} connected
          </span>
          <span className="id-creatordash__meta-pill highlight">
            Profile value {fmt(snapshot.profileValueScore, 1)}
          </span>
        </div>

        <div className="id-creatordash__tabs">
          {CREATOR_DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`id-creatordash__tab${
                creatorDashboardTab === tab.id ? ' active' : ''
              }`}
              onClick={() => setCreatorDashboardTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {creatorDashboardTab === 'earnings' ? (
          <>
            <div className="id-creatordash__kpis">
              <div className="id-creatordash__kpi">
                <span className="id-creatordash__kpi-key">Total earnings</span>
                <span className="id-creatordash__kpi-val mono">{fmt(snapshot.kpis.totalEarnings)} iC</span>
              </div>
              <div className="id-creatordash__kpi">
                <span className="id-creatordash__kpi-key">Tips received</span>
                <span className="id-creatordash__kpi-val mono">{fmt(snapshot.kpis.tipsReceived)} iC</span>
              </div>
              <div className="id-creatordash__kpi">
                <span className="id-creatordash__kpi-key">Verified views</span>
                <span className="id-creatordash__kpi-val">{fmtViews(snapshot.kpis.verifiedViews)}</span>
              </div>
              <div className="id-creatordash__kpi">
                <span className="id-creatordash__kpi-key">Active campaigns</span>
                <span className="id-creatordash__kpi-val">{snapshot.kpis.activeCampaigns}</span>
              </div>
              <div className="id-creatordash__kpi">
                <span className="id-creatordash__kpi-key">Pending review</span>
                <span className="id-creatordash__kpi-val">{snapshot.kpis.pendingReview}</span>
              </div>
              <div className="id-creatordash__kpi highlight">
                <span className="id-creatordash__kpi-key">Attention value</span>
                <span className="id-creatordash__kpi-val">{snapshot.kpis.attentionValueScore}</span>
              </div>
            </div>

            <section className="id-creatordash__panel">
              <p className="id-creatordash__panel-title">Revenue breakdown · estimated preview</p>
              <div className="id-creatordash__revenue">
                {snapshot.revenue.map((row) => (
                  <div key={row.id} className="id-creatordash__revenue-row">
                    <div className="id-creatordash__revenue-label">
                      <span>{row.label}</span>
                      <span className="id-creatordash__revenue-pct">{row.sharePct}%</span>
                    </div>
                    <div className="id-creatordash__revenue-bar">
                      <span style={{ width: `${row.sharePct}%` }} />
                    </div>
                    <span className="id-creatordash__revenue-amt mono">{fmt(row.amount)} iC</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="id-creatordash__panel">
              <p className="id-creatordash__panel-title">Platform performance · simulated</p>
              <div className="id-creatordash__platforms">
                {filteredPlatforms.map((row) => {
                  const meta = profilePlatformMeta(row.platformId)
                  const active =
                    selectedCreatorPlatform === row.platformId ||
                    selectedCreatorPlatform === 'all'
                  return (
                    <button
                      key={row.platformId}
                      type="button"
                      className={`id-creatordash__platform${
                        row.connected ? '' : ' locked'
                      }${active && selectedCreatorPlatform === row.platformId ? ' active' : ''}`}
                      onClick={() => handlePlatformTap(row.platformId)}
                    >
                      <span
                        className="id-creatordash__platform-badge"
                        style={{ background: meta.color }}
                      >
                        {meta.initials}
                      </span>
                      <span className="id-creatordash__platform-text">
                        <span className="id-creatordash__platform-name">{meta.name}</span>
                        <span className="id-creatordash__platform-sub">
                          {row.connected ? 'Connected · simulated' : 'Locked · connect to unlock'}
                        </span>
                      </span>
                      <span className="id-creatordash__platform-metrics">
                        <span>{fmtViews(row.verifiedViews)} views</span>
                        <span className="mono">{fmt(row.earnedValue)} iC</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        ) : null}

        {creatorDashboardTab === 'content' ? (
          <section className="id-creatordash__panel">
            <p className="id-creatordash__panel-title">Top content · simulated</p>
            <div className="id-creatordash__content-list">
              {filteredContent.map((item) => {
                const meta = profilePlatformMeta(item.platformId)
                const selected = selectedCreatorContentId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`id-creatordash__content-card${
                      item.locked ? ' locked' : ''
                    }${selected ? ' selected' : ''}`}
                    onClick={() =>
                      selectCreatorContent(selected ? null : item.id)
                    }
                    disabled={item.locked}
                  >
                    <span
                      className="id-creatordash__content-badge"
                      style={{ background: meta.color }}
                    >
                      {meta.initials}
                    </span>
                    <span className="id-creatordash__content-text">
                      <span className="id-creatordash__content-title">{item.title}</span>
                      <span className="id-creatordash__content-meta">
                        {meta.name} · {item.verifiedViews} verified views
                      </span>
                    </span>
                    <span className="id-creatordash__content-side">
                      <span className="mono">{fmt(item.earnedValue)} iC</span>
                      <span
                        className={`id-creatordash__content-status${
                          item.rewardReady ? ' ready' : ''
                        }`}
                      >
                        {item.rewardReady ? 'Reward-ready' : 'Preview'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ) : null}

        {creatorDashboardTab === 'campaigns' ? (
          <section className="id-creatordash__panel">
            <p className="id-creatordash__panel-title">Campaign snapshot · simulated</p>
            <div className="id-creatordash__campaign">
              <div className="id-creatordash__campaign-row">
                <span className="id-creatordash__campaign-key">Active campaign</span>
                <span className="id-creatordash__campaign-val">{snapshot.campaign.title}</span>
              </div>
              <div className="id-creatordash__campaign-row">
                <span className="id-creatordash__campaign-key">Status</span>
                <span className="id-creatordash__campaign-val">{snapshot.campaign.status}</span>
              </div>
              <div className="id-creatordash__campaign-row">
                <span className="id-creatordash__campaign-key">Budget remaining</span>
                <span className="id-creatordash__campaign-val mono">
                  {fmt(snapshot.campaign.budgetRemaining)} iC
                </span>
              </div>
              <div className="id-creatordash__campaign-row">
                <span className="id-creatordash__campaign-key">Verified attention</span>
                <span className="id-creatordash__campaign-val">
                  {fmtViews(snapshot.campaign.verifiedAttention)} est.
                </span>
              </div>
              <div className="id-creatordash__campaign-row">
                <span className="id-creatordash__campaign-key">CTA performance</span>
                <span className="id-creatordash__campaign-val">
                  {snapshot.campaign.ctaPerformance}% · preview
                </span>
              </div>
            </div>
            <button
              type="button"
              className="id-creatordash__btn id-creatordash__btn--primary"
              onClick={openCampaignPreview}
            >
              Create campaign
            </button>
          </section>
        ) : null}

        {creatorDashboardTab === 'wallet' ? (
          <section className="id-creatordash__panel">
            <p className="id-creatordash__panel-title">Creator wallet snapshot · preview</p>
            <div className="id-creatordash__wallet-grid">
              <div className="id-creatordash__wallet-cell">
                <span className="id-creatordash__wallet-key">Available</span>
                <span className="id-creatordash__wallet-val mono">
                  {fmt(snapshot.wallet.available)} iC
                </span>
              </div>
              <div className="id-creatordash__wallet-cell">
                <span className="id-creatordash__wallet-key">Pending</span>
                <span className="id-creatordash__wallet-val mono">
                  {fmt(snapshot.wallet.pending)} iC
                </span>
              </div>
              <div className="id-creatordash__wallet-cell">
                <span className="id-creatordash__wallet-key">Tips</span>
                <span className="id-creatordash__wallet-val mono">
                  {fmt(snapshot.wallet.tips)} iC
                </span>
              </div>
              <div className="id-creatordash__wallet-cell">
                <span className="id-creatordash__wallet-key">Converted</span>
                <span className="id-creatordash__wallet-val mono">
                  {fmt(snapshot.wallet.converted)} iC
                </span>
              </div>
            </div>
            <button type="button" className="id-creatordash__btn" onClick={openWallet}>
              Open wallet
            </button>
          </section>
        ) : null}

        <section className="id-creatordash__routes">
          <p className="id-creatordash__panel-title">Creator routes</p>
          <div className="id-creatordash__route-row">
            <button type="button" className="id-creatordash__route-btn" onClick={openStudioPreview}>
              Open Studio
            </button>
            <button type="button" className="id-creatordash__route-btn" onClick={openCampaignPreview}>
              Campaign
            </button>
            <button type="button" className="id-creatordash__route-btn" onClick={handleBack}>
              Profile
            </button>
            <button type="button" className="id-creatordash__route-btn" onClick={openWallet}>
              Wallet
            </button>
          </div>
        </section>

        <p className="id-creatordash__disclaimer">
          Simulated creator dashboard. No real platform analytics, payments, or external account
          access.
        </p>
      </div>
    </div>
  )
}
