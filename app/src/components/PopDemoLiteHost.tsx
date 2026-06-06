import { useCallback, useEffect } from 'react'
import { useVision } from '../contexts/VisionContext'
import { usePopDemoLiteVoice } from '../hooks/usePopDemoLiteVoice'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import { emitRemoteGesture } from '../lib/visionGestureBridge'
import {
  isPopDemoLiteEnabled,
  popDemoLiteStore,
  type PopDemoLiteVoiceCommand,
} from '../lib/popDemoLite'
import { useDemo } from '../state/useDemo'
import type { DemoScreenId } from '../state/types'

function dispatchVoiceCommand(
  command: PopDemoLiteVoiceCommand,
  actions: {
    setScreen: (screen: DemoScreenId) => void
    beginImmersiveWatch: (offer: typeof DEFAULT_SPONSORED_OFFER) => void
  },
): void {
  switch (command) {
    case 'open_wallet':
      actions.setScreen('wallet')
      break
    case 'start_watch':
      actions.beginImmersiveWatch(DEFAULT_SPONSORED_OFFER)
      break
    case 'open_feed':
      actions.setScreen('immersive-feed')
      break
    case 'open_promo':
      actions.setScreen('immersive-promo')
      break
    case 'like':
    case 'save':
      popDemoLiteStore.recordGesture('bothBlink')
      emitRemoteGesture('bothBlink')
      break
  }
}

export function PopDemoLiteHost() {
  const enabled = isPopDemoLiteEnabled()
  const vision = useVision()
  const { setScreen, beginImmersiveWatch } = useDemo()

  const onVoiceCommand = useCallback(
    (command: PopDemoLiteVoiceCommand, transcript: string) => {
      popDemoLiteStore.recordVoice(command, transcript)
      dispatchVoiceCommand(command, { setScreen, beginImmersiveWatch })
    },
    [setScreen, beginImmersiveWatch],
  )

  usePopDemoLiteVoice(onVoiceCommand, enabled)

  useEffect(() => {
    if (!enabled) return

    const onGesture = (event: Event) => {
      const detail = (event as CustomEvent<{ trigger?: string }>).detail
      if (detail?.trigger) popDemoLiteStore.recordGesture(detail.trigger)
    }

    window.addEventListener('remoteGestureTrigger', onGesture)
    return () => window.removeEventListener('remoteGestureTrigger', onGesture)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const sampleGaze = () => {
      const state = vision?.visionState
      if (!state) return
      const engaged = Boolean(state.hasFace && state.gazePosition)
      popDemoLiteStore.recordGaze(engaged)
    }

    sampleGaze()
    const id = window.setInterval(sampleGaze, 500)
    return () => window.clearInterval(id)
  }, [enabled, vision?.visionState])

  return null
}
