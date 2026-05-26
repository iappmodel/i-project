import { useEffect, useState } from 'react'
import {
  DEMO_LOCAL_USER_REF,
  getPopValidatorBaseUrl,
  isLiveWalletEnabled,
} from '../lib/settlementConfig'

export interface ProofSealedEvent {
  type: 'proof-sealed'
  sessionId: string
  localUserRef: string | null
  mode: 'pending' | 'full'
  reviewStatus: string
  holdOutcome: string | null
  timestamp: string
  source: 'web' | 'flutter' | 'unknown'
}

export interface ProofEventsState {
  enabled: boolean
  connected: boolean
  lastEvent: ProofSealedEvent | null
  eloStatusLine: string
}

function formatEloStatus(event: ProofSealedEvent | null): string {
  if (!event) {
    return 'Listening for POP senses via proof-events stream…'
  }
  const who =
    event.source === 'flutter'
      ? 'Flutter Seal Proof'
      : event.source === 'web'
        ? 'Web demo'
        : 'Unknown client'
  return `${who} sealed ${event.sessionId.slice(0, 12)}… · ${event.reviewStatus}`
}

export function useProofEvents(onSealed?: (event: ProofSealedEvent) => void): ProofEventsState {
  const enabled = isLiveWalletEnabled()
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<ProofSealedEvent | null>(null)

  useEffect(() => {
    if (!enabled) return

    const base = getPopValidatorBaseUrl()
    if (!base) return

    const params = new URLSearchParams({ localUserRef: DEMO_LOCAL_USER_REF })
    const source = new EventSource(
      `${base.replace(/\/$/, '')}/v1/proof-events/stream?${params.toString()}`,
    )

    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)
    source.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as ProofSealedEvent
        if (parsed.type !== 'proof-sealed') return
        setLastEvent(parsed)
        onSealed?.(parsed)
      } catch {
        // ignore malformed events
      }
    }

    return () => {
      source.close()
      setConnected(false)
    }
  }, [enabled, onSealed])

  return {
    enabled,
    connected,
    lastEvent,
    eloStatusLine: formatEloStatus(lastEvent),
  }
}
