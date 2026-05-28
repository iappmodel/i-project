import type { EloWakeWordState } from '../../hooks/useEloWakeWord'

export interface EloEvokePromptProps {
  visible: boolean
  onEvoke: () => void
  onArmVoice: () => void
  wake: EloWakeWordState
}

export function EloEvokePrompt({ visible, onEvoke, onArmVoice, wake }: EloEvokePromptProps) {
  if (!visible) return null

  const hint = !wake.armed
    ? 'Tap Evoke ELO or enable voice, then say “ELO”'
    : wake.listening
      ? 'Listening… say “ELO”'
      : wake.error
        ? `Voice: ${wake.error} — tap Evoke ELO`
        : 'Allow microphone in browser settings'

  return (
    <div className="elo-evoke-prompt" role="dialog" aria-label="Evoke ELO">
      <div className="elo-evoke-prompt__inner">
        <span className="elo-evoke-prompt__pulse" aria-hidden />
        <p className="elo-evoke-prompt__title">Say &ldquo;ELO&rdquo;</p>
        <p className="elo-evoke-prompt__hint">{hint}</p>
        <div className="elo-evoke-prompt__actions">
          {!wake.armed && wake.supported ? (
            <button type="button" className="elo-evoke-prompt__btn elo-evoke-prompt__btn--ghost" onClick={onArmVoice}>
              Enable voice
            </button>
          ) : null}
          <button type="button" className="elo-evoke-prompt__btn" onClick={onEvoke}>
            Evoke ELO
          </button>
        </div>
        {wake.lastHeard ? (
          <p className="elo-evoke-prompt__heard mono">Heard: {wake.lastHeard}</p>
        ) : null}
      </div>
    </div>
  )
}
