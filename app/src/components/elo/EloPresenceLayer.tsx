import { useCallback } from 'react'
import { useEloFaceMirror } from '../../hooks/useEloFaceMirror'
import { useEloPresence } from '../../hooks/useEloPresence'
import { useEloWakeWord } from '../../hooks/useEloWakeWord'
import { useElo } from '../../state/eloContext'
import { EloEvokePrompt } from './EloEvokePrompt'
import { EloFaceMembrane } from './EloFaceMembrane'
import { EloOnboardingSheet } from './EloOnboardingSheet'
import { EloPresencePanel } from './EloPresencePanel'

function glowClass(orbState: string): string | undefined {
  if (orbState === 'hasInsight' || orbState === 'thinking') return 'elo-membrane-glow--insight'
  if (orbState === 'celebrating') return 'elo-membrane-glow--celebrating'
  if (orbState === 'warning') return 'elo-membrane-glow--warning'
  return undefined
}

export interface EloPresenceLayerProps {
  attentionScore?: number
}

export function EloPresenceLayer({ attentionScore: attentionScoreProp }: EloPresenceLayerProps) {
  const { visible, orbState, attentionScore } = useEloPresence(attentionScoreProp)
  const { config, evoked, evoke, openPanel, openOnboarding, onboardingOpen } = useElo()
  const { expression, paths, eyeScaleY } = useEloFaceMirror({ orbState, attentionScore })

  const handleEvoke = useCallback(() => {
    evoke()
    if (!config.onboardingComplete) {
      openOnboarding()
    }
  }, [evoke, config.onboardingComplete, openOnboarding])

  const wake = useEloWakeWord(handleEvoke, visible && !evoked)

  if (!visible) return null

  const showMembrane = evoked || config.activated
  const showEvokePrompt = !evoked

  return (
    <>
      <div className="elo-presence-layer">
        {showMembrane ? (
          <>
            <EloFaceMembrane
              expression={expression}
              paths={paths}
              eyeScaleY={eyeScaleY}
              emerged={showMembrane}
              orbGlowClass={glowClass(orbState)}
            />
            <button
              type="button"
              className="elo-membrane-hit"
              aria-label="Open ELO presence"
              onClick={openPanel}
            />
          </>
        ) : null}
      </div>

      <EloEvokePrompt visible={showEvokePrompt} onEvoke={handleEvoke} wake={wake} />
      <EloOnboardingSheet open={onboardingOpen && !config.onboardingComplete} />
      <EloPresencePanel />
    </>
  )
}
