import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { useDemo } from '../state/useDemo'

const phases = [
  {
    id: 'p1',
    title: 'Phase 1 · Loop 1 spine',
    body: 'React demo + POP validator + Supabase ledger settle + demo auth (smokes PASS).',
    status: 'done',
  },
  {
    id: 'p2',
    title: 'Phase 2 · Auth + extraction',
    body: 'Supabase demo auth, settle user id, P0 chat 104/104 complete.',
    status: 'done',
  },
  {
    id: 'p3',
    title: 'Phase 3 · Proof bridge',
    body: 'SSE proof-events relay; Flutter and web share validator; Elo live status.',
    status: 'done',
  },
  {
    id: 'p4',
    title: 'Phase 4 · Rails prep',
    body: 'Deep links, wallet flash, Stripe functions promoted, readiness UX.',
    status: 'done',
  },
  {
    id: 'p5',
    title: 'Phase 5 · Native return path',
    body: 'Flutter WALLET_APP_URL deep link; Earn/Watch bridge UX; Capacitor prep doc.',
    status: 'done',
  },
  {
    id: 'p6',
    title: 'Phase 6 · Capacitor shell',
    body: '@capacitor/* installed; cap:sync scripts; native add via setup_capacitor_shell.sh --add.',
    status: 'done',
  },
  {
    id: 'p7',
    title: 'Phase 7 · Organism hardening',
    body: 'Elo companion card, Android env smokes, phase index, Stripe checkout when keys live.',
    status: 'active',
  },
] as const

export function RoadmapScreen() {
  const { setScreen, resetDemo, appMode, exitPresenter } = useDemo()

  return (
    <PhoneFrame scroll>
      <BackRow label="Proof layer" onBack={() => setScreen('proof-layer')} />
      <h1 className="screen-title">Roadmap</h1>
      <p className="screen-sub">
        Build phases · module list deferred (MOD-01)
      </p>

      <div className="timeline">
        {phases.map((p, idx) => (
          <div key={p.id} className={`timeline-card ${p.status}`}>
            <div className="timeline-rail">{idx + 1}</div>
            <div>
              <p className="timeline-title">{p.title}</p>
              <p className="timeline-body">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={() => resetDemo()}>Restart demo</Button>
      {appMode === 'presenter' ? (
        <Button variant="secondary" style={{ marginTop: 8 }} onClick={() => exitPresenter()}>
          Exit presenter · product tabs
        </Button>
      ) : (
        <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setScreen('profile')}>
          Back to profile
        </Button>
      )}
      <SourceEvidence
        paths={[
          'docs/MVP_CANONICAL_FLOW.md',
          'integrations/eye-tracking/demos/investor-demo/src/screens/RoadmapScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
