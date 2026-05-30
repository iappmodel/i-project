import { useCallback, useEffect, useRef, useState } from 'react'
import { getSpeechRecognition, type EloSpeechRecognition } from '../lib/elo/speechRecognition'
import { useElo } from '../state/eloContext'

export interface EloPanelVoiceState {
  supported: boolean
  listening: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
}

/** One-shot speech capture for ELO panel chat (opt-in mic tap) */
export function useEloPanelVoice(onTranscript: (text: string) => void, enabled: boolean): EloPanelVoiceState {
  const { pulseSpeech } = useElo()
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<EloSpeechRecognition | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const supported = getSpeechRecognition() !== null

  onTranscriptRef.current = onTranscript

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    if (!enabled || !supported || listening) return

    const Ctor = getSpeechRecognition()
    if (!Ctor) return

    stopListening()
    const recognition = new Ctor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      const transcript = last?.[0]?.transcript?.trim()
      if (transcript) {
        pulseSpeech(0.65)
        onTranscriptRef.current(transcript)
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    try {
      recognition.start()
      setListening(true)
      setError(null)
      pulseSpeech(0.35)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mic unavailable')
      setListening(false)
    }
  }, [enabled, listening, supported, stopListening, pulseSpeech])

  useEffect(() => () => stopListening(), [stopListening])

  return { supported, listening, error, startListening, stopListening }
}
