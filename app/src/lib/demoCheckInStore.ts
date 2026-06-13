const KEY = 'i-demo-checkin-v1'

export type CheckInState = {
  streakDays: number
  longestStreak: number
  lastCheckInAt: number | null
}

const defaultState = (): CheckInState => ({
  streakDays: 0,
  longestStreak: 0,
  lastCheckInAt: null,
})

function load(): CheckInState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CheckInState) : defaultState()
  } catch {
    return defaultState()
  }
}

function save(s: CheckInState) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function readDemoCheckIn(): CheckInState {
  return load()
}

export function recordDemoCheckIn(): CheckInState {
  const prev = load()
  const now = Date.now()
  const dayMs = 86400000
  let streak = 1
  if (prev.lastCheckInAt && now - prev.lastCheckInAt < dayMs * 2) {
    streak = prev.streakDays + 1
  }
  const next: CheckInState = {
    streakDays: streak,
    longestStreak: Math.max(prev.longestStreak, streak),
    lastCheckInAt: now,
  }
  save(next)
  return next
}
