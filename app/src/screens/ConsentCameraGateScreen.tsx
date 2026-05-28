import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { CONSENT_PROOF_STATUS } from '../data/demoData'
import { DEMO_IMMERSIVE_MEDIA } from '../data/immersiveFeedContext'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { useDemo } from '../state/useDemo'

const PERMISSIONS = [
  {
    title: 'Camera permission',
    sub: 'Required in production to capture gaze landmarks on-device.',
  },
  {
    title: 'On-device attention signal',
    sub: 'Fixation and dwell scores computed locally before payout eligibility.',
  },
  {
    title: 'No raw video stored',
    sub: 'Only derived attention metrics leave the device in the production path.',
  },
] as const

export function ConsentCameraGateScreen() {
  const { acceptConsentAndBeginSession, setScreen, walletBackend, proofEventsConnected, selectedOffer } =
    useDemo()
  const webVision = isWebVisionEnabled()
  const fromImmersive = selectedOffer?.id === DEMO_IMMERSIVE_MEDIA.contentId

  return (
    <PhoneFrame scroll>
      <h1 className="screen-title">Enable attention verification</h1>
      <p className="screen-sub">
        {webVision
          ? 'Web vision is enabled — camera-based gaze runs in-browser when you continue. Metrics attach as proof hints only; validator settlement rules are unchanged.'
          : 'Production uses camera-based attention proof before payout. This React investor demo simulates the gaze signal — no camera stream is opened in the browser.'}
        {walletBackend === 'live'
          ? proofEventsConnected
            ? ' Flutter Seal Proof can post real packets in parallel (SSE bridge live).'
            : ' Set ./scripts/dev_stack.sh for live POP bridge.'
          : ''}
      </p>

      <div className="req-list-loop consent-permissions">
        {PERMISSIONS.map((item) => (
          <div key={item.title} className="req-item-loop">
            <div className="req-icon-loop consent-perm-icon" aria-hidden>
              ◉
            </div>
            <div>
              <div className="req-title-loop">{item.title}</div>
              <div className="req-sub-loop">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="proof-layer-card consent-proof-card">
        <p className="proof-layer-card__title">Proof layer status</p>
        <div className="consent-proof-rows">
          <div className="consent-proof-row">
            <span className="consent-proof-row__label">React demo</span>
            <span className="consent-proof-row__val mono">{CONSENT_PROOF_STATUS.reactDemo}</span>
          </div>
          <div className="consent-proof-row">
            <span className="consent-proof-row__label">Flutter runtime</span>
            <span className="consent-proof-row__val mono">{CONSENT_PROOF_STATUS.flutterRuntime}</span>
          </div>
          <div className="consent-proof-row">
            <span className="consent-proof-row__label">Android smoke test</span>
            <span className="consent-proof-row__val mono">{CONSENT_PROOF_STATUS.androidSmokeTest}</span>
          </div>
        </div>
      </div>

      <p className="consent-disclaimer mono-muted">
        Investor demo uses simulated gaze. Flutter runtime contains the real camera pipeline pending device smoke
        test.
      </p>

      <Button className="prot-cta" style={{ marginTop: 'auto' }} onClick={() => acceptConsentAndBeginSession()}>
        {webVision ? 'Allow camera & begin watch' : 'Allow demo verification'}
      </Button>
      <Button
        variant="ghost"
        style={{ marginTop: 8 }}
        onClick={() => setScreen(fromImmersive ? 'immersive-feed' : 'offer-detail')}
      >
        {fromImmersive ? 'Back to feed' : 'Back to offer'}
      </Button>

      <SourceEvidence
        paths={[
          'docs/technical/EYE_TRACKING_INTEGRATION_MAP.md',
          'docs/technical/FLUTTER_RUNTIME_PROMOTION_REPORT.md',
          'docs/technical/ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md',
          '06_feed_earning_loops/iapp_loop1_watch_verify_earn.html',
        ]}
      />
    </PhoneFrame>
  )
}
