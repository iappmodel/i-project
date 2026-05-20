import { useContext } from 'react'
import { DemoContext } from './demoContext'

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
