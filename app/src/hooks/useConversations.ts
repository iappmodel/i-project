import { useMemo } from 'react'
import { readDemoThreads } from '../lib/demoConversationsStore'

export function useConversations() {
  const threads = useMemo(() => readDemoThreads(), [])
  const unreadTotal = threads.reduce((n, t) => n + t.unread, 0)
  return { threads, unreadTotal }
}
