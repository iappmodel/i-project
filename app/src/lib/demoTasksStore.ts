/** Demo-mode tasks + XP when Supabase auth is off (localStorage). */

import type { TaskTemplate, UserLevel, UserTask } from '../hooks/useTasks'

const TASKS_KEY = 'i-demo-tasks-v1'
const LEVEL_KEY = 'i-demo-level-v1'

const DEMO_USER = 'demo-user'

const DEMO_TEMPLATES: TaskTemplate[] = [
  {
    id: 'dt-watch',
    title: 'Watch 3 Videos',
    description: 'Watch 3 videos to earn rewards',
    type: 'daily',
    category: 'engagement',
    goal: 3,
    reward_type: 'vicoin',
    reward_value: 15,
    xp_reward: 10,
    icon: 'play',
  },
  {
    id: 'dt-like',
    title: 'Like 5 Posts',
    description: 'Show appreciation for content you enjoy',
    type: 'daily',
    category: 'engagement',
    goal: 5,
    reward_type: 'vicoin',
    reward_value: 10,
    xp_reward: 5,
    icon: 'heart',
  },
  {
    id: 'dt-share',
    title: 'Share Content',
    description: 'Share a video with friends',
    type: 'daily',
    category: 'social',
    goal: 1,
    reward_type: 'vicoin',
    reward_value: 20,
    xp_reward: 15,
    icon: 'share',
  },
  {
    id: 'dt-login',
    title: 'Daily Login',
    description: 'Log in to the app',
    type: 'daily',
    category: 'engagement',
    goal: 1,
    reward_type: 'vicoin',
    reward_value: 5,
    xp_reward: 5,
    icon: 'calendar',
  },
  {
    id: 'dt-invite',
    title: 'Invite a Friend',
    description: 'Invite a friend to join',
    type: 'weekly',
    category: 'social',
    goal: 1,
    reward_type: 'icoin',
    reward_value: 50,
    xp_reward: 25,
    icon: 'user-plus',
  },
  {
    id: 'dt-streak',
    title: '7-Day Streak',
    description: 'Log in for 7 days in a row',
    type: 'streak',
    category: 'engagement',
    goal: 7,
    reward_type: 'icoin',
    reward_value: 200,
    xp_reward: 100,
    icon: 'flame',
  },
]

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function seedTasks(): UserTask[] {
  const period = todayIso()
  return DEMO_TEMPLATES.map((template, i) => ({
    id: `demo-task-${template.id}`,
    user_id: DEMO_USER,
    template_id: template.id,
    progress: i === 3 ? 1 : i === 0 ? 2 : 0,
    goal: template.goal,
    completed: i === 3,
    completed_at: i === 3 ? new Date().toISOString() : null,
    reward_claimed: false,
    period_start: period,
    template,
  }))
}

function defaultLevel(): UserLevel {
  return {
    id: 'demo-level',
    user_id: DEMO_USER,
    current_xp: 42,
    total_xp: 42,
    level: 2,
    streak_days: 3,
    last_active_date: todayIso(),
    longest_streak: 5,
  }
}

function loadTasks(): UserTask[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY)
    if (!raw) {
      const seeded = seedTasks()
      localStorage.setItem(TASKS_KEY, JSON.stringify(seeded))
      return seeded
    }
    const rows = JSON.parse(raw) as UserTask[]
    return rows.map((row) => ({
      ...row,
      template: DEMO_TEMPLATES.find((t) => t.id === row.template_id),
    }))
  } catch {
    return seedTasks()
  }
}

function saveTasks(rows: UserTask[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(rows))
}

export function listDemoTasks(): UserTask[] {
  return loadTasks()
}

export function getDemoUserLevel(): UserLevel {
  try {
    const raw = localStorage.getItem(LEVEL_KEY)
    return raw ? (JSON.parse(raw) as UserLevel) : defaultLevel()
  } catch {
    return defaultLevel()
  }
}

export function claimDemoTaskReward(taskId: string): { ok: boolean; label?: string } {
  const rows = loadTasks()
  const idx = rows.findIndex((t) => t.id === taskId)
  if (idx < 0) return { ok: false }
  const task = rows[idx]
  if (!task.completed || task.reward_claimed || !task.template) return { ok: false }

  rows[idx] = { ...task, reward_claimed: true }
  saveTasks(rows)

  const tpl = task.template
  const label =
    tpl.reward_type === 'xp'
      ? `+${tpl.xp_reward} XP`
      : `+${tpl.reward_value} ${tpl.reward_type.toUpperCase()}`
  return { ok: true, label }
}
