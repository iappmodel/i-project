const KEY = 'i-demo-gamification-v1'

export type Achievement = { id: string; title: string; unlocked: boolean; xp: number }
export type SpinState = { lastSpinAt: number | null; canSpin: boolean }

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-watch', title: 'First watch', unlocked: true, xp: 50 },
  { id: 'streak-3', title: '3-day streak', unlocked: false, xp: 100 },
  { id: 'promo-5', title: '5 promos', unlocked: false, xp: 150 },
]

function load(): { achievements: Achievement[]; spin: SpinState } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as { achievements: Achievement[]; spin: SpinState }
  } catch {
    /* ignore */
  }
  return { achievements: DEFAULT_ACHIEVEMENTS, spin: { lastSpinAt: null, canSpin: true } }
}

function save(data: { achievements: Achievement[]; spin: SpinState }) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function readGamification() {
  return load()
}

export function spinWheel(): { prize: string; xp: number } {
  const data = load()
  const prizes = ['+5 XP', '+10 XP', '+2 i', '+1 v', 'Jackpot +25 XP']
  const pick = prizes[Math.floor(Math.random() * prizes.length)]
  const xp = pick.includes('XP') ? parseInt(pick.match(/\d+/)?.[0] ?? '5', 10) : 0
  data.spin = { lastSpinAt: Date.now(), canSpin: false }
  save(data)
  return { prize: pick, xp }
}

export function resetSpinCooldown() {
  const data = load()
  data.spin.canSpin = true
  save(data)
}
