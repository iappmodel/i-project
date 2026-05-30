import { getSessionGreetingShort } from '../../lib/elo/sessionOpenings'

export interface EloSessionGreetingProps {
  visible: boolean
  onOpenPanel: () => void
}

export function EloSessionGreeting({ visible, onOpenPanel }: EloSessionGreetingProps) {
  if (!visible) return null

  return (
    <button type="button" className="elo-session-greeting" onClick={onOpenPanel}>
      <span className="elo-session-greeting__label">ELO</span>
      <span className="elo-session-greeting__text">{getSessionGreetingShort()}</span>
    </button>
  )
}
