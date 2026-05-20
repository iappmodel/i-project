import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { CREATOR_CAMPAIGN, ECONOMIC_SPLIT } from '../data/demoData'
import { useDemo } from '../state/useDemo'

export function CreatorEconomicsScreen() {
  const { setScreen } = useDemo()

  return (
    <PhoneFrame scroll>
      <BackRow label="Wallet" onBack={() => setScreen('wallet')} />
      <h1 className="screen-title">Creator economics</h1>
      <p className="screen-sub">Attention marketplace · canonical 60 / 30 / 10 split</p>

      <article className="eco-card neu-surface">
        <header className="eco-hdr">
          <span>Live campaign</span>
          <strong className="mono ic">{CREATOR_CAMPAIGN.status}</strong>
        </header>
        <p className="eco-body">
          {CREATOR_CAMPAIGN.brand} — {CREATOR_CAMPAIGN.name}. Budget{' '}
          {CREATOR_CAMPAIGN.budgetICoins.toLocaleString()} i · CPM {CREATOR_CAMPAIGN.cpm}.
        </p>
      </article>

      <div className="split-canonical">
        <div className="split-canonical__cell">
          <span className="mono-muted">Creator</span>
          <div className="split-canonical__pct split-canonical__pct--creator">
            {ECONOMIC_SPLIT.creatorPct}%
          </div>
        </div>
        <div className="split-canonical__cell">
          <span className="mono-muted">Viewer</span>
          <div className="split-canonical__pct split-canonical__pct--viewer">
            {ECONOMIC_SPLIT.viewerPct}%
          </div>
        </div>
        <div className="split-canonical__cell">
          <span className="mono-muted">Platform</span>
          <div className="split-canonical__pct split-canonical__pct--platform">
            {ECONOMIC_SPLIT.platformPct}%
          </div>
        </div>
      </div>

      <p className="eco-footnote mono-muted">
        Matches `iapp_creator_economy.html` and `i-creator-pitch_1.html` — not illustrative alternate percentages.
      </p>

      <Button onClick={() => setScreen('proof-layer')}>View proof layer</Button>
      <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setScreen('feed')}>
        Back to feed
      </Button>
      <SourceEvidence
        paths={[
          '05_creator_campaigns/iapp_creator_economy.html',
          '05_creator_campaigns/campaign_builder_owner.html',
          '03_pitch_pages/i-creator-pitch_1.html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/CreatorEconomicsScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
