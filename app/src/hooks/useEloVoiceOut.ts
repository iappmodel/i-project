import { useCallback, useState } from 'react'
import {
  loadVoiceOutEnabled,
  saveVoiceOutEnabled,
  speakEloText,
  stopEloSpeech,
  voiceParamsFromStack,
  isSpeechOutSupported,
} from '../lib/elo/eloSpeechOut'
import type { EloPersonalityStack } from '../lib/elo/types'

export function useEloVoiceOut(onPulse?: (amount: number) => void) {
  const [enabled, setEnabled] = useState(loadVoiceOutEnabled)
  const supported = isSpeechOutSupported()

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      saveVoiceOutEnabled(next)
      if (!next) stopEloSpeech()
      return next
    })
  }, [])

  const speak = useCallback(
    (text: string, stack: EloPersonalityStack) => {
      if (!enabled || !supported) return
      const params = voiceParamsFromStack(stack)
      speakEloText(text, {
        ...params,
        onPulse: () => onPulse?.(0.18),
        onStart: () => onPulse?.(0.45),
        onEnd: () => onPulse?.(0.25),
      })
    },
    [enabled, onPulse, supported],
  )

  return { enabled, supported, toggle, speak, stop: stopEloSpeech }
}
