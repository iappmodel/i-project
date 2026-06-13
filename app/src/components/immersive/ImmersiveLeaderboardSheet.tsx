import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { getDemoUserLevel } from '../../lib/demoTasksStore'

type Props = { open: boolean; onClose: () => void }

const DEMO_LEADERS = [
  { id: '1', name: 'RAFAELO', xp: 4200, level: 8 },
  { id: '2', name: 'You', xp: 1850, level: 5 },
  { id: '3', name: 'Nike_fan', xp: 1200, level: 4 },
  { id: '4', name: 'CapeTown', xp: 900, level: 3 },
]

export function ImmersiveLeaderboardSheet({ open, onClose }: Props) {
  const demo = getDemoUserLevel()
  const youXp = demo.total_xp ?? demo.current_xp ?? 1850
  const youLevel = demo.level ?? 5

  const rows = DEMO_LEADERS.map((r) =>
    r.name === 'You' ? { ...r, xp: youXp, level: youLevel } : r,
  ).sort((a, b) => b.xp - a.xp)

  return (
    <ImmersiveGlassSheet open={open} title="Leaderboard" onClose={onClose}>
      <ol className="leaderboard-sheet__list">
        {rows.map((r, i) => (
          <li key={r.id} className="leaderboard-sheet__item">
            <span className="leaderboard-sheet__rank mono">{i + 1}</span>
            <span className="leaderboard-sheet__name">{r.name}</span>
            <span className="leaderboard-sheet__xp mono">Lv{r.level} · {r.xp} XP</span>
          </li>
        ))}
      </ol>
    </ImmersiveGlassSheet>
  )
}
