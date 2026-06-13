const KEY = 'i-demo-follows-v1'

function load(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function save(map: Record<string, boolean>) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function isDemoFollowing(creatorId: string): boolean {
  return Boolean(load()[creatorId])
}

export function toggleDemoFollow(creatorId: string): boolean {
  const map = load()
  const next = !map[creatorId]
  if (next) map[creatorId] = true
  else delete map[creatorId]
  save(map)
  return next
}
