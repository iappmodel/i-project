import { useMemo } from 'react'
import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorDock } from '../components/InvestorDock'
import {
  CAMPAIGN_ACTION_PRESETS,
  CAMPAIGN_GATE_DEFS,
  CAMPAIGN_REWARD_PRESETS,
  CAMPAIGN_STRICTNESS_OPTIONS,
  campaignActionLabel,
  computeCampaignEconomics,
  type CampaignAction,
} from '../investorDemoData'

export function InvestorCampaignPreviewView() {
  const {
    state,
    goView,
    showToast,
    setCampaignAction,
    setCampaignReward,
    setCampaignStrictness,
    toggleCampaignGate,
    publishCampaignPreview,
    openStudioPreview,
    openCreatorDashboard,
    openBrandDashboard,
  } = useInvestorDemo()

  const { campaign } = state
  const ctaLabel = campaignActionLabel(campaign.selectedAction, campaign.customActionLabel)

  const economics = useMemo(
    () => computeCampaignEconomics(campaign.selectedReward, campaign.budgetCap),
    [campaign.selectedReward, campaign.budgetCap],
  )

  const activeGateCount = useMemo(
    () => Object.values(campaign.enabledGates).filter(Boolean).length,
    [campaign.enabledGates],
  )

  const statusLabel =
    campaign.campaignStatus === 'published' ? 'Published · Simulated' : 'Draft · Simulated'

  const handleBack = () => goView('feed')

  const handleActionSelect = (action: CampaignAction) => {
    setCampaignAction(action)
  }

  const handlePublish = () => {
    if (campaign.campaignStatus === 'published') {
      showToast('Preview already published · simulated only')
      return
    }
    publishCampaignPreview()
    showToast('Campaign preview published · simulated only')
  }

  return (
    <div className="id-campaign">
      <div className="id-campaign__scroll">
        <header className="id-campaign__header">
          <button type="button" className="id-campaign__back" onClick={handleBack}>
            <span className="id-campaign__back-icon" aria-hidden>←</span>
            Feed
          </button>
          <div className="id-campaign__header-row">
            <div className="id-campaign__brand" aria-hidden>◈</div>
            <div className="id-campaign__header-text">
              <h1 className="id-campaign__title">Campaign Builder</h1>
              <p className="id-campaign__status">
                <span
                  className={`id-campaign__status-dot${campaign.campaignStatus === 'published' ? ' published' : ''}`}
                  aria-hidden
                />
                {statusLabel}
              </p>
            </div>
          </div>
        </header>

        <p className="id-campaign__intro">
          Configure a rewarded attention campaign. Preview updates live — no real publishing.
        </p>

        {/* Builder cards */}
        <section className="id-campaign__card">
          <p className="id-campaign__sec">01 · Media</p>
          <div className="id-campaign__media">
            <div className="id-campaign__media-thumb" aria-hidden>▶</div>
            <div className="id-campaign__media-info">
              <p className="id-campaign__media-name">Brand spotlight · demo clip</p>
              <p className="id-campaign__media-meta">Simulated · 0:24 · no upload</p>
            </div>
          </div>
          <button
            type="button"
            className="id-campaign__studio-link"
            onClick={openStudioPreview}
          >
            <span className="id-campaign__studio-icon" aria-hidden>✦</span>
            <span className="id-campaign__studio-text">
              <span className="id-campaign__studio-title">Open Studio Preview</span>
              <span className="id-campaign__studio-sub">Edit media, overlays & CTA · simulated</span>
            </span>
            <span className="id-campaign__studio-arrow" aria-hidden>→</span>
          </button>
        </section>

        <section className="id-campaign__card">
          <p className="id-campaign__sec">02 · Action button</p>
          <div className="id-campaign__preset-grid">
            {CAMPAIGN_ACTION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`id-campaign__preset${campaign.selectedAction === preset.id ? ' active' : ''}`}
                onClick={() => handleActionSelect(preset.id)}
              >
                <span
                  className="id-campaign__preset-dot"
                  style={{ background: preset.color }}
                  aria-hidden
                />
                <span className="id-campaign__preset-label">{preset.label}</span>
                <span className="id-campaign__preset-hint">{preset.hint}</span>
              </button>
            ))}
          </div>
          {campaign.selectedAction === 'custom' && (
            <input
              type="text"
              className="id-campaign__custom-input"
              placeholder="e.g. Claim free ticket"
              value={campaign.customActionLabel}
              onChange={(e) => setCampaignAction('custom', e.target.value)}
              maxLength={32}
            />
          )}
        </section>

        <section className="id-campaign__card">
          <p className="id-campaign__sec">03 · Reward</p>
          <div className="id-campaign__reward-row">
            {CAMPAIGN_REWARD_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                className={`id-campaign__reward-chip${campaign.selectedReward === amount ? ' active' : ''}`}
                onClick={() => setCampaignReward(amount)}
              >
                {amount.toFixed(2)} iC
              </button>
            ))}
          </div>
          <p className="id-campaign__reward-note">Per verified viewer · simulated</p>
        </section>

        <section className="id-campaign__card">
          <p className="id-campaign__sec">04 · Verification gates</p>
          <div className="id-campaign__strict-row">
            {CAMPAIGN_STRICTNESS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`id-campaign__strict-chip${campaign.verificationStrictness === opt.id ? ' active' : ''}`}
                onClick={() => setCampaignStrictness(opt.id)}
              >
                <span className="id-campaign__strict-label">{opt.label}</span>
                <span className="id-campaign__strict-sub">{opt.sublabel}</span>
              </button>
            ))}
          </div>
          <div className="id-campaign__gate-list">
            {CAMPAIGN_GATE_DEFS.map((gate) => {
              const enabled = campaign.enabledGates[gate.id]
              return (
                <button
                  key={gate.id}
                  type="button"
                  className={`id-campaign__gate${enabled ? ' on' : ''}`}
                  onClick={() => toggleCampaignGate(gate.id)}
                  aria-pressed={enabled}
                >
                  <span className="id-campaign__gate-check" aria-hidden>
                    {enabled ? '✓' : ''}
                  </span>
                  <span className="id-campaign__gate-text">
                    <span className="id-campaign__gate-label">{gate.label}</span>
                    <span className="id-campaign__gate-sub">{gate.sublabel}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="id-campaign__card">
          <p className="id-campaign__sec">05 · Audience</p>
          <div className="id-campaign__static-row">
            <span className="id-campaign__static-label">Target</span>
            <span className="id-campaign__static-value">Open feed · interest match</span>
          </div>
          <div className="id-campaign__static-row">
            <span className="id-campaign__static-label">Age</span>
            <span className="id-campaign__static-value">18+ · simulated</span>
          </div>
        </section>

        <section className="id-campaign__card">
          <p className="id-campaign__sec">06 · Budget</p>
          <div className="id-campaign__budget">
            <span className="id-campaign__budget-cap mono">{campaign.budgetCap.toFixed(0)} iC</span>
            <span className="id-campaign__budget-label">simulated cap</span>
          </div>
          <p className="id-campaign__budget-note">
            Demo budget only — not charged to any wallet.
          </p>
        </section>

        {/* Live preview */}
        <section className="id-campaign__preview-wrap">
          <p className="id-campaign__preview-label">Live preview</p>
          <div className="id-campaign__preview-card">
            <div className="id-campaign__preview-media">
              <span className="id-campaign__preview-play" aria-hidden>▶</span>
              <span className="id-campaign__preview-badge">
                Earn {campaign.selectedReward.toFixed(2)} iC
              </span>
            </div>
            <div className="id-campaign__preview-body">
              <p className="id-campaign__preview-brand">Your Brand · Simulated</p>
              <p className="id-campaign__preview-caption">
                Sponsored attention offer · {activeGateCount} verification gate
                {activeGateCount === 1 ? '' : 's'}
              </p>
              <button type="button" className="id-campaign__preview-cta" disabled>
                {ctaLabel}
              </button>
              <p className="id-campaign__preview-verify">
                <span aria-hidden>◎</span> Verified attention required
              </p>
            </div>
          </div>
        </section>

        {/* Economics */}
        <section className="id-campaign__econ">
          <p className="id-campaign__econ-title">Campaign economics · simulated</p>
          <div className="id-campaign__econ-grid">
            <div className="id-campaign__econ-cell">
              <span className="id-campaign__econ-key">Viewer reward</span>
              <span className="id-campaign__econ-val mono">
                {economics.viewerReward.toFixed(2)} iC
              </span>
            </div>
            <div className="id-campaign__econ-cell">
              <span className="id-campaign__econ-key">Creator / share</span>
              <span className="id-campaign__econ-val mono">
                {economics.creatorShare.toFixed(2)} iC
              </span>
            </div>
            <div className="id-campaign__econ-cell">
              <span className="id-campaign__econ-key">Platform fee</span>
              <span className="id-campaign__econ-val mono">
                {economics.platformFee.toFixed(2)} iC
              </span>
            </div>
            <div className="id-campaign__econ-cell highlight">
              <span className="id-campaign__econ-key">Est. verified views</span>
              <span className="id-campaign__econ-val mono">
                {economics.estimatedVerifiedViews.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="id-campaign__owner-link"
          onClick={openBrandDashboard}
        >
          <span className="id-campaign__owner-icon" aria-hidden>◎</span>
          <span className="id-campaign__owner-text">
            <span className="id-campaign__owner-title">Owner Analytics</span>
            <span className="id-campaign__owner-sub">
              Track verified attention, reward pool, fraud screen, and CTA performance
            </span>
          </span>
          <span className="id-campaign__owner-arrow" aria-hidden>→</span>
        </button>

        <button
          type="button"
          className="id-campaign__publish"
          onClick={handlePublish}
        >
          {campaign.campaignStatus === 'published' ? 'Published preview' : 'Publish preview'}
        </button>

        <button
          type="button"
          className="id-campaign__dashboard-link"
          onClick={openCreatorDashboard}
        >
          View creator dashboard →
        </button>

        <p className="id-campaign__disclaimer">
          Simulated campaign setup. No real ad spend or publishing.
        </p>
      </div>

      <InvestorDock />
    </div>
  )
}
