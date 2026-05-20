import { BackRow } from '../components/BackRow'
import { PhoneFrame } from '../components/PhoneFrame'
import { useDemo } from '../demo/useDemo'

const phases = [
  {
    id: 'p1',
    title: 'Phase 1 · Presenter fidelity',
    body: 'Clickable UX shell aligned to HTML comps. Mock ledger + deterministic demo loop.',
    status: 'active',
  },
  {
    id: 'p2',
    title: 'Phase 2 · Native signal stack',
    body: 'On-device fixation + honesty checks with privacy-preserving hashing.',
    status: 'next',
  },
  {
    id: 'p3',
    title: 'Phase 3 · Rails & compliance',
    body: 'KYC-lite withdrawal + conversion confirmations with audited providers.',
    status: 'future',
  },
] as const

export function RoadmapScreen() {
  const { setScreen } = useDemo()

  return (
    <PhoneFrame scroll>
      <BackRow label="Feed" onBack={() => setScreen('feed')} />
      <header>
        <h1 className="screen-title">Roadmap</h1>
        <p className="screen-sub">Investor narration · aligned to HTML prototype fidelity</p>
      </header>

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
    </PhoneFrame>
  )
}
