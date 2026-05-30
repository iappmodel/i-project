import { getSessionOpening } from '../../lib/elo/sessionOpenings'
import { useElo } from '../../state/eloContext'

export interface EloSessionGreetingProps {
  visible: boolean
  onOpenPanel: () => void
}

export function EloSessionGreeting({ visible, onOpenPanel }: EloSessionGreetingProps) {
  const { config } = useElo()
  if (!visible) return null

  const opening = getSessionOpening(config.stack)

  return (
    <button type="button" className="elo-session-greeting" onClick={onOpenPanel}>
      <span className="elo-session-greeting__label">ELO</span>
      <span className="elo-session-greeting__text">{opening}</span>
    </button>
  )
}
