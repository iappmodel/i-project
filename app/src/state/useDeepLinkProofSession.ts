import { useEffect } from 'react'
import type { DemoScreenId } from './types'

/** Deep link: `?proofSession=sess_…` or `?session=…` opens wallet tab. */
export function useDeepLinkProofSession(
  navigateTo: (screen: DemoScreenId) => void,
  onSession?: (sessionId: string) => void,
): void {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const session = params.get('proofSession')?.trim() || params.get('session')?.trim()
    if (!session) return

    onSession?.(session)
    navigateTo('wallet')

    params.delete('proofSession')
    params.delete('session')
    const next = params.toString()
    const path = window.location.pathname
    window.history.replaceState({}, '', next ? `${path}?${next}` : path)
  }, [navigateTo, onSession])
}
