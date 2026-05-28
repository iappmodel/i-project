import { useCallback, useState } from 'react'
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
  return 'elo-membrane-glow--insight'
}

export interface EloPresenceLayerProps {
  attentionScore?: number
}

export function EloPresenceLayer({ attentionScore: attentionScoreProp }: EloPresenceLayerProps) {
  const { visible, orbState, attentionScore } = useEloPresence(attentionScoreProp)
  const { config, evoked, evoke, openPanel, openOnboarding, onboardingOpen } = useElo()
  const { expression, paths, eyeScaleY } = useEloFaceMirror({ orbState, attentionScore })
  const [evokeFlash, setEvokeFlash] = useState<string | null>(null)

  const handleEvoke = useCallback(() => {
    evoke()
    if (!config.onboardingComplete) {
      openOnboarding()
    } else {
      setEvokeFlash('ELO is here')
      window.setTimeout(() => setEvokeFlash(null), 2400)
    }
  }, [evoke, config.onboardingComplete, openOnboarding])

  const wake = useEloWakeWord(handleEvoke, visible && !evoked)

  const handleEvokeTap = useCallback(() => {
    wake.armVoice()
    handleEvoke()
  }, [wake.armVoice, handleEvoke])

  if (!visible) return null

  const showMembrane = evoked
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

      <EloEvokePrompt
        visible={showEvokePrompt}
        onEvoke={handleEvokeTap}
        onArmVoice={wake.armVoice}
        wake={wake}
      />

      {evokeFlash ? <div className="elo-evoke-flash">{evokeFlash}</div> : null}

      <EloOnboardingSheet open={onboardingOpen && !config.onboardingComplete} />
      <EloPresencePanel />
    </>
  )
}
