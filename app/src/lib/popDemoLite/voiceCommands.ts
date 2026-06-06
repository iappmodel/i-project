import type { PopDemoLiteVoiceCommand } from './types'

const PATTERNS: ReadonlyArray<{ re: RegExp; command: PopDemoLiteVoiceCommand }> = [
  { re: /\b(open|show|my)\s+wallet\b/i, command: 'open_wallet' },
  { re: /\b(start|begin)\s+watch\b|\bwatch\s+now\b|\bplay\s+video\b/i, command: 'start_watch' },
  { re: /\blike\s+this\b|\bthumbs?\s+up\b/i, command: 'like' },
  { re: /\b(open|go\s+to)\s+feed\b/i, command: 'open_feed' },
  { re: /\bopen\s+promo\b|\bpromo(tion)?\b/i, command: 'open_promo' },
  { re: /\bsave\s+this\b|\bbookmark\b/i, command: 'save' },
]

export function parsePopDemoLiteVoiceCommand(transcript: string): PopDemoLiteVoiceCommand | null {
  const text = transcript.trim()
  if (!text) return null
  for (const { re, command } of PATTERNS) {
    if (re.test(text)) return command
  }
  return null
}
