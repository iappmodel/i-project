import { useRef } from 'react'
import { Card } from '../components/Card'
import { TabScreenLayout } from '../components/TabScreenLayout'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import { formatIcoinsAmount } from '../lib/format'
import { getWebVisionRuntime, isWebVisionEnabled, useWebVisionEngine } from '../lib/visionEngine'
import { useDemo } from '../state/useDemo'

export function EarnScreen() {
  const webVisionEnabled = isWebVisionEnabled()
  const visionRuntime = getWebVisionRuntime()
  const visionVideoRef = useRef<HTMLVideoElement>(null)
  const visionState = useWebVisionEngine(webVisionEnabled, visionVideoRef)
  const {
    selectOffer,
    appMode,
    startPresenterTour,
    walletBackend,
    proofEventsConnected,
    eloStatusLine,
  } = useDemo()

  return (
    <TabScreenLayout
      activeTab="earn"
      evidence={[
        '06_feed_earning_loops/iapp_loop1_watch_verify_earn.html',
        'docs/MVP_CANONICAL_FLOW.md',
        'MASTER_BRAIN/DECISIONS/DEMO_IA_ADR.md',
      ]}
    >
      <header className="earn-tab-header">
        <h1 className="screen-title">Earn</h1>
        <p className="screen-sub">Loop 1 · Watch → Verify → Earn</p>
        {webVisionEnabled ? (
          <>
            <p className="profile-trust-card__hint mono" style={{ marginTop: 8, fontSize: 11 }}>
              Experimental web vision enabled ({visionRuntime.deviceClass}, smoothing {visionRuntime.preset.gazeSmoothing})
            </p>
            <p className="profile-trust-card__hint mono" style={{ marginTop: 4, fontSize: 11 }}>
              {visionState.isRunning ? '●' : '○'} face={visionState.hasFace ? 'yes' : 'no'} liveness=
              {visionState.livenessScore.toFixed(2)}
            </p>
            <video ref={visionVideoRef} playsInline muted autoPlay style={{ display: 'none' }} />
          </>
        ) : null}
        {walletBackend === 'live' ? (
          <p className="profile-trust-card__hint mono" style={{ marginTop: 8, fontSize: 11 }}>
            {proofEventsConnected ? '●' : '○'} proof bridge · {eloStatusLine}
          </p>
        ) : null}
      </header>

      <section className="earn-loop-card">
        <p className="earn-loop-card__label">Active sponsored offer</p>
        <Card as="button" sponsored onPress={() => selectOffer(DEFAULT_SPONSORED_OFFER)}>
          <div className="thumb">
            <div
              className="thumb-gradient"
              style={{ background: DEFAULT_SPONSORED_OFFER.thumbnailGradient }}
            />
            <div className="thumb-overlay" />
            <div className="thumb-platform-feed">
              <span className="platform-dot-feed platform-dot-feed-yt">
                {DEFAULT_SPONSORED_OFFER.platformCode ?? 'YT'}
              </span>
              <span className="platform-name-feed">{DEFAULT_SPONSORED_OFFER.platform}</span>
            </div>
            <span className="thumb-duration-feed mono">
              {DEFAULT_SPONSORED_OFFER.watchDuration ?? '4:30'}
            </span>
            <div className="thumb-earn-feed">
              <span className="earn-dot-feed" />
              <span className="earn-val-feed mono">
                {formatIcoinsAmount(DEFAULT_SPONSORED_OFFER.rewardICoins)}
              </span>
            </div>
          </div>
          <div className="card-body card-body--sponsored-tail">
            <p className="card-caption">
              <strong>{DEFAULT_SPONSORED_OFFER.brand}</strong> — {DEFAULT_SPONSORED_OFFER.title}
            </p>
            <p className="card-caption muted-caption">Five verification gates · pending-first payout</p>
          </div>
        </Card>
      </section>

      <ul className="earn-steps-list">
        <li>Consent + attention session</li>
        <li>Watch with POP / gaze signals (mocked in demo)</li>
        <li>Verify → reward → wallet</li>
      </ul>

      {appMode === 'product' ? (
        <button type="button" className="presenter-link" onClick={() => startPresenterTour()}>
          Run full investor presenter walkthrough
        </button>
      ) : null}
    </TabScreenLayout>
  )
}
