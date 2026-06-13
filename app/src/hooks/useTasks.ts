import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient, isSupabaseAuthEnabled } from '../lib/supabaseClient'
import { claimDemoTaskReward, getDemoUserLevel, listDemoTasks } from '../lib/demoTasksStore'
import { useDemo } from '../state/useDemo'

export interface TaskTemplate {
  id: string
  title: string
  description: string | null
  type: 'daily' | 'weekly' | 'milestone' | 'streak'
  category: string
  goal: number
  reward_type: 'vicoin' | 'icoin' | 'xp'
  reward_value: number
  xp_reward: number
  icon: string | null
}

export interface UserTask {
  id: string
  user_id: string
  template_id: string
  progress: number
  goal: number
  completed: boolean
  completed_at: string | null
  reward_claimed: boolean
  period_start: string
  template?: TaskTemplate
}

export interface UserLevel {
  id: string
  user_id: string
  current_xp: number
  total_xp: number
  level: number
  streak_days: number
  last_active_date: string | null
  longest_streak: number
}

interface TaskXpSyncPayload {
  xpAwarded: number
  level: number
  currentXp: number
  totalXp: number
}

export const getXpForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

function getWeekStart(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const weekStart = new Date(today.setDate(diff))
  return weekStart.toISOString().split('T')[0]
}

export function useTasks(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const { authUserId, supabaseAuthEnabled } = useDemo()
  const isLive = supabaseAuthEnabled && Boolean(authUserId)
  const [tasks, setTasks] = useState<UserTask[]>([])
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadDemo = useCallback(() => {
    setTasks(listDemoTasks())
    setUserLevel(getDemoUserLevel())
  }, [])

  const loadLive = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase || !authUserId) return

    const { data: existing } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', authUserId)
      .maybeSingle()

    if (existing) {
      setUserLevel(existing as UserLevel)
    } else {
      setUserLevel({
        id: `local-${authUserId}`,
        user_id: authUserId,
        current_xp: 0,
        total_xp: 0,
        level: 1,
        streak_days: 0,
        last_active_date: null,
        longest_streak: 0,
      })
    }

    const { data: templates } = await supabase
      .from('task_templates')
      .select('*')
      .eq('is_active', true)

    const allTemplates = (templates ?? []) as TaskTemplate[]
    const localWeekStart = getWeekStart()

    const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-user-tasks', {
      body: {},
    })
    if (syncError) {
      console.error('Error syncing user tasks:', syncError)
    }

    const serverWeekStart = (syncData as { weekStart?: string } | null)?.weekStart
    const taskPeriodLowerBound =
      typeof serverWeekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(serverWeekStart)
        ? serverWeekStart
        : localWeekStart

    const { data: allTasks } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', authUserId)
      .gte('period_start', taskPeriodLowerBound)
      .order('created_at', { ascending: true })

    const tasksWithTemplates = (allTasks ?? []).map((task) => ({
      ...task,
      template: allTemplates.find((t) => t.id === task.template_id),
    })) as UserTask[]

    setTasks(tasksWithTemplates)
  }, [authUserId])

  const refresh = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    try {
      if (isLive) {
        await loadLive()
      } else {
        loadDemo()
      }
    } finally {
      setIsLoading(false)
    }
  }, [enabled, isLive, loadDemo, loadLive])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const claimTaskReward = useCallback(
    async (taskId: string): Promise<string | null> => {
      if (!enabled) return null

      if (!isLive) {
        const result = claimDemoTaskReward(taskId)
        if (!result.ok) return null
        loadDemo()
        return result.label ?? 'Reward claimed'
      }

      const supabase = getSupabaseClient()
      if (!supabase) return null

      const task = tasks.find((t) => t.id === taskId)
      if (!task || !task.completed || task.reward_claimed || !task.template) return null

      const idempotencyKey = crypto.randomUUID()
      const { data, error } = await supabase.functions.invoke('issue-reward', {
        headers: { 'idempotency-key': idempotencyKey },
        body: {
          rewardType: 'user_task_complete',
          contentId: task.id,
        },
      })

      if (error) {
        let message = error.message || 'Failed to claim task reward'
        const errorWithContext = error as { context?: Response }
        if (errorWithContext.context) {
          try {
            const payload = (await errorWithContext.context.json()) as { error?: string; code?: string }
            if (payload?.error) message = payload.error
            if (payload?.code === 'reward_already_claimed') {
              setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, reward_claimed: true } : t)),
              )
            }
          } catch {
            // keep fallback
          }
        }
        return message
      }

      const result = data as {
        success?: boolean
        amount?: number
        coinType?: 'vicoin' | 'icoin' | null
        error?: string
        code?: string
        taskXp?: TaskXpSyncPayload
      }

      if (!result?.success) {
        if (result?.code === 'reward_already_claimed') {
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, reward_claimed: true } : t)),
          )
        }
        return result?.error || 'Failed to claim task reward'
      }

      const serverTaskXp = result.taskXp ?? null
      if (serverTaskXp && authUserId) {
        setUserLevel((prev) =>
          prev
            ? {
                ...prev,
                current_xp: serverTaskXp.currentXp,
                total_xp: serverTaskXp.totalXp,
                level: serverTaskXp.level,
              }
            : {
                id: `local-${authUserId}`,
                user_id: authUserId,
                current_xp: serverTaskXp.currentXp,
                total_xp: serverTaskXp.totalXp,
                level: serverTaskXp.level,
                streak_days: 0,
                last_active_date: null,
                longest_streak: 0,
              },
        )
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, reward_claimed: true } : t)),
      )

      const tpl = task.template
      if (tpl.reward_type === 'xp') {
        return `+${serverTaskXp?.xpAwarded ?? tpl.xp_reward} XP`
      }
      return `+${result.amount ?? tpl.reward_value} ${(result.coinType ?? tpl.reward_type).toUpperCase()}`
    },
    [authUserId, enabled, isLive, loadDemo, tasks],
  )

  return {
    tasks,
    userLevel,
    isLoading,
    isLive,
    isDemo: !isLive && isSupabaseAuthEnabled() === false,
    claimTaskReward,
    refresh,
  }
}
