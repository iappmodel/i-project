import { useCallback, useEffect } from 'react'
import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { getXpForLevel, useTasks, type UserTask } from '../../hooks/useTasks'

type Props = {
  open: boolean
  onClose: () => void
  onToast?: (message: string) => void
}

const ICON: Record<string, string> = {
  play: '▶',
  heart: '♥',
  share: '↗',
  calendar: '◷',
  'user-plus': '+',
  'check-circle': '✓',
  flame: '⚡',
  target: '◎',
}

function taskIcon(key: string | null | undefined): string {
  return ICON[key ?? 'target'] ?? '◎'
}

function rewardClass(type: string): string {
  if (type === 'vicoin') return 'task-sheet__reward--vicoin'
  if (type === 'icoin') return 'task-sheet__reward--icoin'
  return 'task-sheet__reward--xp'
}

function TaskRow({
  task,
  onClaim,
}: {
  task: UserTask
  onClaim: (taskId: string) => void
}) {
  const template = task.template
  if (!template) return null

  const progress = Math.min(100, (task.progress / Math.max(task.goal, 1)) * 100)
  const canClaim = task.completed && !task.reward_claimed
  const done = task.completed && task.reward_claimed

  return (
    <li className={`task-sheet__item${done ? ' task-sheet__item--done' : ''}`}>
      <div className="task-sheet__item-head">
        <span className="task-sheet__icon" aria-hidden>
          {taskIcon(template.icon)}
        </span>
        <div className="task-sheet__copy">
          <span className="task-sheet__name">{template.title}</span>
          {template.description ? (
            <span className="task-sheet__desc">{template.description}</span>
          ) : null}
        </div>
        <span className="task-sheet__count mono">
          {task.completed ? '✓' : `${task.progress}/${task.goal}`}
        </span>
      </div>
      <div className="task-sheet__bar" aria-hidden>
        <span className="task-sheet__bar-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="task-sheet__footer">
        <div className="task-sheet__rewards">
          <span className={`task-sheet__reward ${rewardClass(template.reward_type)}`}>
            +{template.reward_value} {template.reward_type.toUpperCase()}
          </span>
          <span className="task-sheet__xp mono">+{template.xp_reward} XP</span>
        </div>
        {canClaim ? (
          <Button variant="secondary" className="task-sheet__claim" onClick={() => onClaim(task.id)}>
            Claim
          </Button>
        ) : null}
      </div>
    </li>
  )
}

function TaskSection({
  title,
  badge,
  tasks,
  onClaim,
}: {
  title: string
  badge: string
  tasks: UserTask[]
  onClaim: (taskId: string) => void
}) {
  if (tasks.length === 0) return null
  const done = tasks.filter((t) => t.completed).length
  return (
    <section className="task-sheet__section">
      <div className="task-sheet__section-head">
        <span className="task-sheet__section-title">{title}</span>
        <span className="task-sheet__section-badge mono">
          {badge} · {done}/{tasks.length}
        </span>
      </div>
      <ul className="task-sheet__list">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onClaim={onClaim} />
        ))}
      </ul>
    </section>
  )
}

export function ImmersiveTaskCenterSheet({ open, onClose, onToast }: Props) {
  const { tasks, userLevel, isLoading, isLive, claimTaskReward, refresh } = useTasks({
    enabled: open,
  })

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  const handleClaim = useCallback(
    async (taskId: string) => {
      const label = await claimTaskReward(taskId)
      if (label) onToast?.(label)
    },
    [claimTaskReward, onToast],
  )

  const daily = tasks.filter((t) => t.template?.type === 'daily')
  const weekly = tasks.filter((t) => t.template?.type === 'weekly')
  const streak = tasks.filter((t) => t.template?.type === 'streak')
  const completedCount = tasks.filter((t) => t.completed).length
  const xpRequired = userLevel ? getXpForLevel(userLevel.level) : 100
  const xpPct = userLevel
    ? Math.min(100, (userLevel.current_xp / Math.max(xpRequired, 1)) * 100)
    : 0

  return (
    <ImmersiveGlassSheet open={open} title="Tasks & Rewards" onClose={onClose}>
      <div className="task-sheet">
        {!isLive ? (
          <p className="immersive-glass-sheet__hint">Demo tasks · sign in for live sync</p>
        ) : (
          <p className="immersive-glass-sheet__hint mono">Live · synced from Supabase</p>
        )}

        {userLevel ? (
          <div className="task-sheet__level">
            <div className="task-sheet__level-badge mono">{userLevel.level}</div>
            <div className="task-sheet__level-copy">
              <span className="task-sheet__level-title">Level {userLevel.level}</span>
              <span className="task-sheet__level-xp mono">
                {userLevel.current_xp} / {xpRequired} XP
              </span>
            </div>
            <div className="task-sheet__streak">
              <span className="task-sheet__streak-num mono">{userLevel.streak_days}d</span>
              <span className="task-sheet__streak-label">streak</span>
            </div>
          </div>
        ) : null}

        {userLevel ? (
          <div className="task-sheet__bar task-sheet__bar--level" aria-hidden>
            <span className="task-sheet__bar-fill" style={{ width: `${xpPct}%` }} />
          </div>
        ) : null}

        <p className="task-sheet__summary mono">
          {completedCount}/{tasks.length} tasks completed
        </p>

        {isLoading && tasks.length === 0 ? (
          <p className="immersive-glass-sheet__hint mono">Loading tasks…</p>
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <p className="immersive-glass-sheet__hint">No tasks this period — check back soon.</p>
        ) : null}

        <TaskSection title="Daily" badge="◷" tasks={daily} onClaim={handleClaim} />
        <TaskSection title="Weekly" badge="▦" tasks={weekly} onClaim={handleClaim} />
        <TaskSection title="Streak" badge="⚡" tasks={streak} onClaim={handleClaim} />
      </div>
    </ImmersiveGlassSheet>
  )
}
