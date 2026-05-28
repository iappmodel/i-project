import { useEffect, useMemo } from 'react'
import { useDemo } from '../state/useDemo'
import { useElo } from '../state/eloContext'
import { deriveOrbState } from '../lib/elo/expressionEngine'
import { useVision } from '../contexts/VisionContext'

const ELO_SCREENS = new Set(['immersive-feed', 'watch-verify'])

export function useEloPresence(attentionScoreProp?: number) {
  const { appMode, currentScreen, proofEventsConnected, eloStatusLine, verificationStatus } =
    useDemo()
  const { config, setOrbState } = useElo()
  const vision = useVision()

  const visible =
    appMode === 'product' && ELO_SCREENS.has(currentScreen) && config.stack.layers.length > 0

  const hasFace = vision?.visionState.hasFace ?? false
  const verificationWatching =
    currentScreen === 'watch-verify' &&
    (verificationStatus === 'watching' || verificationStatus === 'verifying')

  const attentionScore = useMemo(() => {
    if (!verificationWatching) return attentionScoreProp
    if (attentionScoreProp !== undefined) return attentionScoreProp
    const vs = vision?.visionState
    if (vs?.hasFace) {
      return Math.min(1, Math.max(0, vs.livenessScore || vs.eyeOpenness || 0.7))
    }
    return 0.5
  }, [verificationWatching, attentionScoreProp, vision?.visionState])

  const orbState = useMemo(
    () =>
      deriveOrbState({
        proofConnected: proofEventsConnected,
        eloStatusLine,
        hasFace,
        verificationWatching,
        attentionScore,
      }),
    [proofEventsConnected, eloStatusLine, hasFace, verificationWatching, attentionScore],
  )

  useEffect(() => {
    setOrbState(orbState)
  }, [orbState, setOrbState])

  const needsOnboarding = visible && !config.onboardingComplete

  return {
    visible,
    needsOnboarding,
    hasFace,
    orbState,
    verificationWatching,
    currentScreen,
    attentionScore,
  }
}
