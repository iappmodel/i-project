export type DemoComment = {
  id: string
  contentId: string
  userId: string
  username: string
  content: string
  createdAt: number
  likes: number
}

const KEY = 'i-demo-comments-v1'
export const COMMENT_MAX_LENGTH = 500

function load(): DemoComment[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DemoComment[]) : []
  } catch {
    return []
  }
}

function save(rows: DemoComment[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

export function readDemoComments(contentId: string): DemoComment[] {
  return load()
    .filter((c) => c.contentId === contentId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function addDemoComment(
  contentId: string,
  userId: string,
  username: string,
  content: string,
): DemoComment[] {
  const row: DemoComment = {
    id: `demo-${Date.now()}`,
    contentId,
    userId,
    username,
    content: content.trim(),
    createdAt: Date.now(),
    likes: 0,
  }
  const next = [row, ...load()]
  save(next)
  return readDemoComments(contentId)
}
