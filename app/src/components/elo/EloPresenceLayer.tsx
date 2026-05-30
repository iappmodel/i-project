import { useCallback, useEffect, useRef, useState } from 'react'
import { useEloFaceMirror } from '../../hooks/useEloFaceMirror'
import { useEloPresence } from '../../hooks/useEloPresence'
import { useEloWakeWord } from '../../hooks/useEloWakeWord'
import { useElo } from '../../state/eloContext'
import { EloEvokePrompt } from './EloEvokePrompt'
import { EloFaceMembrane } from './EloFaceMembrane'
import { EloOnboardingSheet } from './EloOnboardingSheet'
import { EloPresencePanel } from './EloPresencePanel'
import { EloSessionGreeting } from './EloSessionGreeting'

const MANIFEST_MS = 1350
const SESSION_PANEL_DELAY_MS = 700

export interface EloPresenceLayerProps {
  attentionScore?: number
}

export function EloPresenceLayer({ attentionScore: attentionScoreProp }: EloPresenceLayerProps) {
  const { visible, orbState, attentionScore } = useEloPresence(attentionScoreProp)
  const {
    config,
    evoked,
    sessionActive,
    evoke,
    startSession,
    openPanel,
    openOnboarding,
    onboardingOpen,
    panelOpen,
  } = useElo()
  const { expression, paths, eyeCenters, eyeScaleY } = useEloFaceMirror({ orbState, attentionScore })
  const [entering, setEntering] = useState(false)
  const manifestTimer = useRef<number | null>(null)
  const sessionTimer = useRef<number | null>(null)

  const finishManifest = useCallback(() => {
    setEntering(false)
    startSession()
    if (!config.onboardingComplete) {
      openOnboarding()
      return
    }
    if (sessionTimer.current) window.clearTimeout(sessionTimer.current)
    sessionTimer.current = window.setTimeout(() => openPanel(), SESSION_PANEL_DELAY_MS)
  }, [config.onboardingComplete, openOnboarding, openPanel, startSession])

  const handleEvoke = useCallback(() => {
    if (evoked || entering) return
    setEntering(true)
    evoke()
    if (manifestTimer.current) window.clearTimeout(manifestTimer.current)
    manifestTimer.current = window.setTimeout(finishManifest, MANIFEST_MS)
  }, [entering, evoked, evoke, finishManifest])

  const wake = useEloWakeWord(handleEvoke, visible && !evoked && !entering)

  useEffect(
    () => () => {
      if (manifestTimer.current) window.clearTimeout(manifestTimer.current)
      if (sessionTimer.current) window.clearTimeout(sessionTimer.current)
    },
    [],
  )

  if (!visible) return null

  const showMembrane = evoked || entering
  const showVoiceHint = !evoked && !entering
  const showSessionGreeting =
    sessionActive && config.onboardingComplete && !onboardingOpen && !panelOpen

  return (
    <>
      <div className="elo-presence-layer">
        {showMembrane ? (
          <>
            <EloFaceMembrane
              expression={expression}
              paths={paths}
              eyeCenters={eyeCenters}
              eyeScaleY={eyeScaleY}
              visualForm={config.stack.visualForm}
              emerged={showMembrane}
              entering={entering}
            />
            {sessionActive ? (
              <button
                type="button"
                className="elo-membrane-hit"
                aria-label="Open ELO presence"
                onClick={openPanel}
              />
            ) : null}
          </>
        ) : null}

        <EloEvokePrompt
          visible={showVoiceHint}
          onArmVoice={wake.armVoice}
          onFallbackEvoke={handleEvoke}
          wake={wake}
        />

        <EloSessionGreeting visible={showSessionGreeting} onOpenPanel={openPanel} />
      </div>

      <EloOnboardingSheet open={onboardingOpen && !config.onboardingComplete} />
      <EloPresencePanel />
    </>
  )
}
