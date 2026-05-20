import { createContext } from 'react'
import type { DemoContextValue } from './types'

export const AttentionDemoContext = createContext<DemoContextValue | null>(null)
