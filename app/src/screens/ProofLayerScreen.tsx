import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { PROOF_LAYER_STATUS } from '../data/demoData'
import { useDemo } from '../state/useDemo'

export function ProofLayerScreen() {
  const { setScreen } = useDemo()
  const status = PROOF_LAYER_STATUS

  return (
    <PhoneFrame scroll>
      <BackRow label="Economics" onBack={() => setScreen('creator-economics')} />
      <h1 className="screen-title">Proof layer</h1>
      <p className="screen-sub">Eye-tracking integration · demo vs production path</p>

      <span className="proof-status-pill proof-status-pill--mock mono">
        Demo mode: {status.demoMode}
      </span>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Signal path (documented)</p>
        <ul className="source-evidence__list">
          {status.signalPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Flutter runtime</p>
        <p className="proof-layer-card__body">
          Status: {status.flutterRuntime}. Promoted under `integrations/eye-tracking/flutter-runtime/` — not wired to
          this React shell yet.
        </p>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Android smoke test</p>
        <p className="proof-layer-card__body">
          Plan: {status.androidSmokeTest} per `docs/technical/ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md`.
        </p>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Governance kernel</p>
        <p className="proof-layer-card__body">
          {status.governanceKernelPresent
            ? 'Reference copy present at integrations/eye-tracking/source/lib/core/intent_os/governance_kernel.dart'
            : 'Not found in archive'}
        </p>
      </div>

      <Button onClick={() => setScreen('roadmap')}>Continue to roadmap</Button>
      <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setScreen('watch-verify')}>
        Replay watch / verify
      </Button>
      <SourceEvidence
        paths={[
          'docs/technical/EYE_TRACKING_INTEGRATION_MAP.md',
          'docs/technical/FLUTTER_RUNTIME_PROMOTION_REPORT.md',
          'docs/technical/ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md',
        ]}
      />
    </PhoneFrame>
  )
}
