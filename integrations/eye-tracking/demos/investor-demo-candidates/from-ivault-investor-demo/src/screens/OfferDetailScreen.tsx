import { BackRow } from '../components/BackRow'
import { PhoneFrame } from '../components/PhoneFrame'
import { formatIcoinsAmount } from '../demo/format'
import { DEFAULT_SPONSORED_OFFER } from '../demo/mockData'
import { useDemo } from '../demo/useDemo'

function ReqOk() {
  return (
    <div className="req-icon-loop">
      <svg width="12" height="12" viewBox="0 0 12 12">
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
  const { selectedOffer, setScreen, startWatchFlow } = useDemo()
  const offer = selectedOffer ?? DEFAULT_SPONSORED_OFFER
  const dwell = offer.watchDuration ?? '4:30'

  return (
    <PhoneFrame scroll>
      <BackRow label="Feed" onBack={() => setScreen('feed')} />

      <div
        className="detail-hero detail-hero--play"
        style={{
          background: offer.thumbnailGradient,
        }}
      >
        <div className="detail-hero-overlay" />
        <svg width="32" height="32" viewBox="0 0 32 32" className="detail-play-ic">
          <polygon points="10,6 26,16 10,26" fill="rgba(240,237,232,0.7)" />
        </svg>
      </div>

      <div className="screen-title prot-offer-brand">{offer.brand}</div>
      <p className="screen-sub">{offer.campaignTagline ?? offer.title}</p>

      <div className="req-list-loop">
        <div className="req-item-loop">
          <ReqOk />
          <div>
            <div className="req-title-loop">
              Watch {dwell} minutes
            </div>
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
          <span className="es-val-loop">60% of ad value</span>
        </div>
        <div className="es-row-loop">
          <span className="es-label-loop">Platform fee</span>
          <span className="es-val-loop">10%</span>
        </div>
      </div>

      <button type="button" className="prot-cta" style={{ marginTop: 'auto' }} onClick={() => startWatchFlow()}>
        Start watching
      </button>
    </PhoneFrame>
  )
}
