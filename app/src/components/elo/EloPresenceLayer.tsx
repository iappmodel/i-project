import { useEloFaceMirror } from '../../hooks/useEloFaceMirror'
import { useEloPresence } from '../../hooks/useEloPresence'
import { useElo } from '../../state/eloContext'
import { EloActivationMoment } from './EloActivationMoment'
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
  global?: boolean
}

export function EloPresenceLayer({ attentionScore: attentionScoreProp, global = true }: EloPresenceLayerProps) {
  const { visible, needsOnboarding, orbState, attentionScore } = useEloPresence(attentionScoreProp)
  const { config, openPanel, activate } = useElo()
  const { expression, paths, eyeScaleY } = useEloFaceMirror({ orbState, attentionScore })

  if (!visible) return null

  const emerged = config.activated || config.onboardingComplete

  return (
    <>
      <EloActivationMoment trigger={visible && config.onboardingComplete && !config.activated} />
      <div className={global ? 'elo-presence-layer elo-presence-layer--global' : 'elo-presence-layer'}>
        <EloFaceMembrane
          expression={expression}
          paths={paths}
          eyeScaleY={eyeScaleY}
          emerged={emerged}
          orbGlowClass={glowClass(orbState)}
        />
        <button
          type="button"
          className="elo-membrane-hit"
          aria-label="Open ELO presence"
          onClick={() => {
            if (!config.activated) activate()
            openPanel()
          }}
        />
      </div>
      <EloOnboardingSheet open={needsOnboarding} />
      <EloPresencePanel />
    </>
  )
}
