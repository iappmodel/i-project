import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSpeechRecognition,
  transcriptContainsEloWake,
  type EloSpeechRecognition,
} from '../lib/elo/speechRecognition'

export interface EloWakeWordState {
  listening: boolean
  supported: boolean
  armed: boolean
  lastHeard: string | null
  error: string | null
  armVoice: () => void
}

export function useEloWakeWord(onWake: () => void, enabled: boolean): EloWakeWordState {
  const [listening, setListening] = useState(false)
  const [armed, setArmed] = useState(false)
  const [lastHeard, setLastHeard] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<EloSpeechRecognition | null>(null)
  const onWakeRef = useRef(onWake)
  const supported = getSpeechRecognition() !== null

  onWakeRef.current = onWake

  const armVoice = useCallback(() => {
    setArmed(true)
  }, [])

  const handleWake = useCallback((transcript: string) => {
    setLastHeard(transcript)
    onWakeRef.current()
  }, [])

  useEffect(() => {
    if (!enabled || !supported || !armed) {
      setListening(false)
      recognitionRef.current?.abort()
      recognitionRef.current = null
      return
    }

    const Ctor = getSpeechRecognition()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (transcriptContainsEloWake(transcript)) {
          handleWake(transcript)
          break
        }
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error)
      }
    }

    recognition.onend = () => {
      setListening(false)
      if (enabled && armed && recognitionRef.current) {
        try {
          recognition.start()
          setListening(true)
        } catch {
          setError('mic restart failed')
        }
      }
    }

    try {
      recognition.start()
      setListening(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'mic unavailable')
    }

    return () => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.abort()
      recognitionRef.current = null
      setListening(false)
    }
  }, [enabled, supported, armed, handleWake])

  return { listening, supported, armed, lastHeard, error, armVoice }
}
