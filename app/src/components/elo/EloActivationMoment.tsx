import { useEffect } from 'react'
import { useElo } from '../../state/eloContext'

export function EloActivationMoment({ trigger }: { trigger: boolean }) {
  const { activate, config } = useElo()

  useEffect(() => {
    if (trigger && !config.activated) {
      activate()
    }
  }, [trigger, config.activated, activate])

  return null
}
