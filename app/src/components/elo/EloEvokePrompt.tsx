import type { EloWakeWordState } from '../../hooks/useEloWakeWord'

export interface EloEvokePromptProps {
  visible: boolean
  onEvoke: () => void
  wake: EloWakeWordState
}

export function EloEvokePrompt({ visible, onEvoke, wake }: EloEvokePromptProps) {
  if (!visible) return null

  return (
    <div className="elo-evoke-prompt" role="status" aria-live="polite">
      <div className="elo-evoke-prompt__inner">
        <span className="elo-evoke-prompt__pulse" aria-hidden />
        <p className="elo-evoke-prompt__title">Say &ldquo;ELO&rdquo;</p>
        <p className="elo-evoke-prompt__hint">
          {wake.supported
            ? wake.listening
              ? 'Listening… speak to evoke your companion'
              : 'Allow microphone to wake ELO by voice'
            : 'Tap below if voice is unavailable'}
        </p>
        <button type="button" className="elo-evoke-prompt__btn" onClick={onEvoke}>
          Evoke ELO
        </button>
        {wake.lastHeard ? (
          <p className="elo-evoke-prompt__heard mono">Heard: {wake.lastHeard}</p>
        ) : null}
      </div>
    </div>
  )
}
