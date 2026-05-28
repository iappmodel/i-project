/** Browser SpeechRecognition — not in all TS lib.dom versions */
export interface EloSpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      0: { transcript: string }
    }
  }
}

export interface EloSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: EloSpeechRecognitionEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => EloSpeechRecognition

export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ELO_WAKE = /\belo\b/i

export function transcriptContainsEloWake(text: string): boolean {
  return ELO_WAKE.test(text.trim())
}
