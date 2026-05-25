import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { useDemo } from '../state/useDemo'

const phases = [
  {
    id: 'p1',
    title: 'Phase 1 · Presenter fidelity',
    body: 'Canonical app workspace (`app/`) aligned to HTML comps. Mock ledger + linear demo loop.',
    status: 'active',
  },
  {
    id: 'p2',
    title: 'Phase 2 · Native signal stack',
    body: 'Wire flutter-runtime gaze channel into watch-verify; Android smoke test pass.',
    status: 'next',
  },
  {
    id: 'p3',
    title: 'Phase 3 · Rails & compliance',
    body: 'KYC-lite withdrawal + conversion with audited providers.',
    status: 'future',
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
