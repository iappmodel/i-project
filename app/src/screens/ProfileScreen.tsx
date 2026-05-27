import { Button } from '../components/Button'
import { EloCompanionCard } from '../components/EloCompanionCard'
import { TabScreenLayout } from '../components/TabScreenLayout'
import { ProgressBar } from '../components/ProgressBar'
import { createSubscriptionCheckout } from '../lib/stripeCheckout'
import { getStripeReadiness, stripeReadinessLabel } from '../lib/stripeConfig'
import { VisionRemoteSettingsCard } from '../components/VisionRemoteSettingsCard'
import { VisionTargetPresetPicker } from '../components/VisionTargetPresetPicker'
import { isWebVisionEnabled, useRemoteGestureListener } from '../lib/visionEngine'
import { useScreenTargetActionListener } from '../lib/visionScreenTargets'
import { useDemo } from '../state/useDemo'
import { useState } from 'react'

/** MOD-01: vision categories only — no committed module list */
const visionCategories = [
  {
    id: 'v1',
    title: 'Attention & verification',
    body: 'POP multimodal validation, optional eye tracking, proof layer',
  },
  {
    id: 'v2',
    title: 'Wallet & economy',
    body: 'Tier 1 a/i/v/e/o currencies, trust, pending-first settlement',
  },
  {
    id: 'v3',
    title: 'Creator & marketplace',
    body: 'Studio, campaigns, 60/30/10 revenue share',
  },
  {
    id: 'v4',
    title: 'Companion & modules',
    body: 'Elo entity, i* module alphabet — roadmap scope TBD (MOD-01)',
  },
] as const

export function ProfileScreen() {
  const {
    setScreen,
    startPresenterTour,
    appMode,
    exitPresenter,
    supabaseAuthEnabled,
    authUserEmail,
    authLoading,
    authError,
    signInDemo,
    proofEventsConnected,
    eloStatusLine,
    isNativeShell,
    nativePlatform,
    lastProofEvent,
    jumpWallet,
  } = useDemo()

  const stripeReadiness = getStripeReadiness()
  const webVisionEnabled = isWebVisionEnabled()
  const lastRemoteGesture = useRemoteGestureListener(webVisionEnabled)
  const lastTargetAction = useScreenTargetActionListener(webVisionEnabled)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeError, setStripeError] = useState<string | null>(null)

  const startProCheckout = async () => {
    setStripeLoading(true)
    setStripeError(null)
    try {
      const { url } = await createSubscriptionCheckout('pro')
      window.location.href = url
    } catch (error) {
      setStripeError(error instanceof Error ? error.message : 'Checkout failed')
    } finally {
      setStripeLoading(false)
    }
  }

  return (
    <TabScreenLayout
      activeTab="profile"
      evidence={[
        'MASTER_BRAIN/RELATIONSHIPS/UNIVERSE_MAP.md',
        'MASTER_BRAIN/DECISIONS/DEMO_IA_ADR.md',
        'MASTER_BRAIN/DECISIONS/ENTITY_ADR.md',
      ]}
    >
      <h1 className="screen-title">Profile</h1>
      <p className="screen-sub">Trust · account · vision</p>

      {webVisionEnabled ? (
        <p className="profile-trust-card__hint mono" style={{ marginBottom: 12 }}>
          Remote gesture bridge · last event: {lastRemoteGesture ?? 'waiting'}
          {lastTargetAction ? ` · target: ${lastTargetAction}` : ''}
        </p>
      ) : null}

      {isNativeShell ? (
        <p className="profile-trust-card__hint mono" style={{ marginBottom: 12 }}>
          Capacitor · {nativePlatform}
        </p>
      ) : null}

      {supabaseAuthEnabled ? (
        <p className="profile-trust-card__hint" style={{ marginBottom: 12 }}>
          {authLoading
            ? 'Signing in demo user…'
            : authUserEmail
              ? `Signed in · ${authUserEmail}`
              : authError
                ? `Auth: ${authError}`
                : 'Demo auth — tap to sign in'}
          {!authLoading && !authUserEmail ? (
            <button type="button" className="sec-link-wu" onClick={() => void signInDemo()} style={{ marginLeft: 8 }}>
              Sign in
            </button>
          ) : null}
        </p>
      ) : null}

      <section className="profile-trust-card">
        <div className="profile-trust-card__row">
          <span className="profile-trust-card__label">Trust score</span>
          <span className="profile-trust-card__value mono">72</span>
        </div>
        <ProgressBar percent={72} />
        <p className="profile-trust-card__hint">Simulated · affects payout speed in production</p>
      </section>

      <EloCompanionCard
        proofEventsConnected={proofEventsConnected}
        eloStatusLine={eloStatusLine}
        lastProofEvent={lastProofEvent}
        onViewWallet={lastProofEvent ? () => jumpWallet() : undefined}
      />

      {stripeReadiness !== 'demo' ? (
        <section className="profile-section">
          <h2 className="profile-section__title">Subscription</h2>
          <p className="profile-trust-card__hint mono">{stripeReadinessLabel(stripeReadiness)}</p>
          {stripeReadiness === 'live' ? (
            <Button
              variant="secondary"
              style={{ marginTop: 8 }}
              disabled={stripeLoading}
              onClick={() => void startProCheckout()}
            >
              {stripeLoading ? 'Opening checkout…' : 'Upgrade to Pro (test)'}
            </Button>
          ) : null}
          {stripeError ? (
            <p className="profile-trust-card__hint" style={{ color: 'var(--accent-rose)', marginTop: 8 }}>
              {stripeError}
            </p>
          ) : null}
        </section>
      ) : null}

      {webVisionEnabled ? (
        <>
          <VisionRemoteSettingsCard />
          <VisionTargetPresetPicker />
        </>
      ) : null}

      <section className="profile-section">
        <h2 className="profile-section__title">Vision categories</h2>
        {visionCategories.map((c) => (
          <div key={c.id} className="profile-vision-card">
            <p className="profile-vision-card__title">{c.title}</p>
            <p className="profile-vision-card__body">{c.body}</p>
          </div>
        ))}
      </section>

      <Button variant="secondary" onClick={() => setScreen('proof-layer')}>
        Proof layer (technical)
      </Button>
      <Button variant="secondary" style={{ marginTop: 8 }} onClick={() => setScreen('roadmap')}>
        Build phases
      </Button>

      {appMode === 'product' ? (
        <Button style={{ marginTop: 12 }} onClick={() => startPresenterTour()}>
          Investor presenter mode
        </Button>
      ) : (
        <Button variant="ghost" style={{ marginTop: 12 }} onClick={() => exitPresenter()}>
          Exit presenter · return to product tabs
        </Button>
      )}
    </TabScreenLayout>
  )
}
