import { useContext } from 'react'
import { AttentionDemoContext } from './attentionDemoContext'
import type { DemoContextValue } from './types'

export function useDemo(): DemoContextValue {
  const ctx = useContext(AttentionDemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
