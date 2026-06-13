export type DemoThread = {
  id: string
  name: string
  preview: string
  unread: number
  updatedAt: number
}

const KEY = 'i-demo-threads-v1'

const SEED: DemoThread[] = [
  { id: 't1', name: 'RAFAELO', preview: 'Thanks for the watch!', unread: 1, updatedAt: Date.now() - 3600000 },
  { id: 't2', name: 'Nike Promo', preview: 'New brief available', unread: 0, updatedAt: Date.now() - 86400000 },
]

function load(): DemoThread[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DemoThread[]) : SEED
  } catch {
    return SEED
  }
}

export function readDemoThreads(): DemoThread[] {
  return load().sort((a, b) => b.updatedAt - a.updatedAt)
}
