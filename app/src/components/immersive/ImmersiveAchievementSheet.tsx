import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { readGamification } from '../../lib/demoGamificationStore'

type Props = { open: boolean; onClose: () => void }

export function ImmersiveAchievementSheet({ open, onClose }: Props) {
  const { achievements } = readGamification()
  return (
    <ImmersiveGlassSheet open={open} title="Achievements" onClose={onClose}>
      <ul className="achievement-sheet__list">
        {achievements.map((a) => (
          <li key={a.id} className={`achievement-sheet__item${a.unlocked ? ' achievement-sheet__item--on' : ''}`}>
            <span className="achievement-sheet__title">{a.title}</span>
            <span className="achievement-sheet__xp mono">+{a.xp} XP</span>
          </li>
        ))}
      </ul>
    </ImmersiveGlassSheet>
  )
}
