import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { PROOF_LAYER_STATUS } from '../data/demoData'
import { summarizeProofPacket } from '../lib/popPacketSummary'
import { useDemo } from '../state/useDemo'

export function ProofLayerScreen() {
  const {
    setScreen,
    proofEventsConnected,
    eloStatusLine,
    walletBackend,
    isNativeShell,
    nativePlatform,
    lastProofEvent,
    lastProofPacket,
    walletSyncError,
  } = useDemo()
  const status = PROOF_LAYER_STATUS
  const packetSummary = lastProofPacket ? summarizeProofPacket(lastProofPacket) : null

  return (
    <PhoneFrame scroll>
      <BackRow label="Economics" onBack={() => setScreen('creator-economics')} />
      <h1 className="screen-title">Proof layer</h1>
      <p className="screen-sub">Eye-tracking integration · demo vs production path</p>

      <span className="proof-status-pill proof-status-pill--mock mono">
        Demo mode: {status.demoMode}
      </span>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Last local proof packet (session)</p>
        <p className="proof-layer-card__body">
          {packetSummary ? (
            <>
              Session <span className="mono">{packetSummary.sessionId.slice(0, 16)}…</span> · review{' '}
              <span className="mono">{packetSummary.reviewStatus}</span> · eligibility{' '}
              {packetSummary.rewardEligibility.toFixed(2)} · integrity{' '}
              {packetSummary.signalIntegrity.toFixed(2)}
              <br />
              Runtime <span className="mono">{packetSummary.runtime}</span> — derived metrics only;
              no camera frames uploaded.
            </>
          ) : (
            'Complete Loop 1 (watch → verify → reward) to assemble a pending Proof Packet v0 in mock mode.'
          )}
        </p>
        {walletSyncError ? (
          <p className="wallet-sync-error" style={{ color: 'var(--accent-rose)', fontSize: 12, marginTop: 8 }}>
            {walletSyncError}
          </p>
        ) : null}
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Signal path (documented)</p>
        <ul className="source-evidence__list">
          {status.signalPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Proof-events relay (SSE)</p>
        <p className="proof-layer-card__body">
          {walletBackend === 'live'
            ? proofEventsConnected
              ? `Live · ${eloStatusLine}`
              : 'Configured but offline — start validator via ./scripts/dev_stack.sh'
            : 'Set VITE_POP_VALIDATOR_URL to enable SSE bridge from Flutter Seal Proof.'}
        </p>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Flutter runtime</p>
        <p className="proof-layer-card__body">
          Status: {status.flutterRuntime}. Seal Proof builds Proof Packet v0 and POSTs to the POP
          validator when `POP_VALIDATOR_URL` is set. This React shell uses a mock packet on Loop 1.
        </p>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">POP settlement</p>
        <p className="proof-layer-card__body">
          Validator stub + Supabase `pop_pending_holds` → `wallet_ledger` wired locally. Run
          `./scripts/dev_stack.sh` then Wallet → Settle (or `VITE_AUTO_SETTLE=true`).
        </p>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Capacitor shell</p>
        <p className="proof-layer-card__body">
          {isNativeShell
            ? `Running in native WebView · ${nativePlatform}`
            : 'Web browser · run ./scripts/setup_capacitor_shell.sh --add for Android/iOS'}
        </p>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Android device loop</p>
        <p className="proof-layer-card__body">
          {status.androidSmokeTest}. Prep: ./scripts/smoke_android_env.sh · orchestration: ./scripts/run_android_dev_loop.sh
          {lastProofEvent?.source === 'flutter'
            ? ` · Last Flutter seal: ${lastProofEvent.sessionId.slice(0, 12)}…`
            : ''}
        </p>
      </div>

      <div className="proof-layer-card">
        <p className="proof-layer-card__title">Android smoke test (legacy plan)</p>
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
