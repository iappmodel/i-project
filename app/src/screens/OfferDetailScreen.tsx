import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { DEFAULT_SPONSORED_OFFER, ECONOMIC_SPLIT } from '../data/demoData'
import { formatIcoinsAmount } from '../lib/format'
import { useDemo } from '../state/useDemo'

function ReqOk() {
  return (
    <div className="req-icon-loop">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
        <circle cx="6" cy="6" r="5" stroke="var(--text-muted)" strokeWidth="1" fill="none" />
        <polyline
          points="3,6 5.5,8.5 9,4"
          stroke="var(--icoin-primary)"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

export function OfferDetailScreen() {
  const { selectedOffer, setScreen, setActiveTab, appMode, startWatchFlow } = useDemo()
  const offer = selectedOffer ?? DEFAULT_SPONSORED_OFFER
  const dwell = offer.watchDuration ?? '4:30'

  const handleBack = () => {
    if (appMode === 'presenter') {
      setScreen('feed')
      return
    }
    setActiveTab('earn')
  }

  return (
    <PhoneFrame scroll>
      <BackRow label={appMode === 'presenter' ? 'Feed' : 'Earn'} onBack={handleBack} />
      <div className="detail-hero detail-hero--play" style={{ background: offer.thumbnailGradient }}>
        <div className="detail-hero-overlay" />
      </div>
      <div className="screen-title prot-offer-brand">{offer.brand}</div>
      <p className="screen-sub">{offer.campaignTagline ?? offer.title}</p>
      <div className="req-list-loop">
        <div className="req-item-loop">
          <ReqOk />
          <div>
            <div className="req-title-loop">Watch {dwell} minutes</div>
            <div className="req-sub-loop">Full video · skipping pauses earn timer</div>
          </div>
        </div>
        <div className="req-item-loop">
          <ReqOk />
          <div>
            <div className="req-title-loop">Eye-tracking verified</div>
            <div className="req-sub-loop">Camera on · gaze must stay on screen</div>
          </div>
        </div>
        <div className="req-item-loop">
          <ReqOk />
          <div>
            <div className="req-title-loop">Attention score ≥ 70</div>
            <div className="req-sub-loop">Composite score from dwell + gaze data</div>
          </div>
        </div>
      </div>
      <div className="earn-summary-loop">
        <div className="es-row-loop">
          <span className="es-label-loop">You earn</span>
          <span className="es-val-loop green mono">{formatIcoinsAmount(offer.rewardICoins)}</span>
        </div>
        <div className="es-row-loop">
          <span className="es-label-loop">Creator earns</span>
          <span className="es-val-loop">{ECONOMIC_SPLIT.creatorPct}% of ad value</span>
        </div>
        <div className="es-row-loop">
          <span className="es-label-loop">Viewer share</span>
          <span className="es-val-loop">{ECONOMIC_SPLIT.viewerPct}%</span>
        </div>
        <div className="es-row-loop">
          <span className="es-label-loop">Platform fee</span>
          <span className="es-val-loop">{ECONOMIC_SPLIT.platformPct}%</span>
        </div>
      </div>
      <Button className="prot-cta" style={{ marginTop: 'auto' }} onClick={() => startWatchFlow()}>
        Start watching
      </Button>
      <SourceEvidence
        paths={[
          '06_feed_earning_loops/iapp_loop1_watch_verify_earn.html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/OfferDetailScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
