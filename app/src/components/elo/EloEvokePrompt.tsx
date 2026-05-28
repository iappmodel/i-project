import type { EloWakeWordState } from '../../hooks/useEloWakeWord'

export interface EloEvokePromptProps {
  visible: boolean
  onArmVoice: () => void
  onFallbackEvoke: () => void
  wake: EloWakeWordState
}

/** Non-blocking hint — feed stays visible until user says “ELO”. */
export function EloEvokePrompt({ visible, onArmVoice, onFallbackEvoke, wake }: EloEvokePromptProps) {
  if (!visible) return null

  const listening = wake.armed && wake.listening
  const hint = listening
    ? 'Listening… say “ELO”'
    : wake.armed
      ? 'Say “ELO”'
      : 'Tap to enable voice · say “ELO”'

  return (
    <div className="elo-voice-hint" role="status" aria-live="polite">
      <button
        type="button"
        className={`elo-voice-hint__pill ${listening ? 'elo-voice-hint__pill--listening' : ''}`}
        onClick={wake.armed ? onFallbackEvoke : onArmVoice}
      >
        <span className="elo-voice-hint__dot" aria-hidden />
        <span className="elo-voice-hint__title">Say &ldquo;ELO&rdquo;</span>
        <span className="elo-voice-hint__sub">{hint}</span>
      </button>
      {wake.lastHeard ? (
        <p className="elo-voice-hint__heard mono">Heard: {wake.lastHeard}</p>
      ) : null}
    </div>
  )
}
