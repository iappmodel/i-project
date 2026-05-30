import { useEffect } from 'react'
import { useDemo } from '../../state/useDemo'
import { useElo } from '../../state/eloContext'

const ELO_SCREENS = new Set(['immersive-feed', 'watch-verify'])

/** Reset evoke/session when user leaves immersive ELO surfaces (feed ↔ wallet, etc.) */
export function EloSessionScope() {
  const { appMode, currentScreen } = useDemo()
  const { dismissSession } = useElo()

  const onEloSurface = appMode === 'product' && ELO_SCREENS.has(currentScreen)

  useEffect(() => {
    if (!onEloSurface) dismissSession()
  }, [onEloSurface, dismissSession])

  return null
}
