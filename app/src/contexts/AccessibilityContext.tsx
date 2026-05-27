import { createContext, useContext, type ReactNode } from 'react'

type AccessibilityValue = {
  reducedMotion: boolean
  highContrast: boolean
}

const defaults: AccessibilityValue = {
  reducedMotion: false,
  highContrast: false,
}

const AccessibilityContext = createContext<AccessibilityValue>(defaults)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  return <AccessibilityContext.Provider value={defaults}>{children}</AccessibilityContext.Provider>
}

export function useAccessibility(): AccessibilityValue {
  return useContext(AccessibilityContext)
}
