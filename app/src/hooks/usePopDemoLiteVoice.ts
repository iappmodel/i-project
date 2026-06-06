import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSpeechRecognition,
  type EloSpeechRecognition,
} from '../lib/elo/speechRecognition'
import { parsePopDemoLiteVoiceCommand } from '../lib/popDemoLite/voiceCommands'
import type { PopDemoLiteVoiceCommand } from '../lib/popDemoLite/types'

export interface PopDemoLiteVoiceState {
  listening: boolean
  supported: boolean
  lastHeard: string | null
  lastCommand: PopDemoLiteVoiceCommand | null
  error: string | null
}

export function usePopDemoLiteVoice(
  onCommand: (command: PopDemoLiteVoiceCommand, transcript: string) => void,
  enabled: boolean,
): PopDemoLiteVoiceState {
  const [listening, setListening] = useState(false)
  const [lastHeard, setLastHeard] = useState<string | null>(null)
  const [lastCommand, setLastCommand] = useState<PopDemoLiteVoiceCommand | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<EloSpeechRecognition | null>(null)
  const onCommandRef = useRef(onCommand)
  const supported = getSpeechRecognition() !== null

  onCommandRef.current = onCommand

  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    setLastHeard(transcript)
    if (!isFinal) return
    const command = parsePopDemoLiteVoiceCommand(transcript)
    if (!command) return
    setLastCommand(command)
    onCommandRef.current(command, transcript)
  }, [])

  useEffect(() => {
    if (!enabled || !supported) {
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
        handleTranscript(transcript, event.results[i].isFinal)
      }
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error)
      }
    }

    recognition.onend = () => {
      setListening(false)
      if (enabled && recognitionRef.current) {
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
  }, [enabled, supported, handleTranscript])

  return { listening, supported, lastHeard, lastCommand, error }
}
