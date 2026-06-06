/** Multi-signal telemetry for POP Demo Lite — simulation only, not production authority. */
export interface PopDemoLiteTelemetry {
  sessionId: string | null
  voiceCommand: string | null
  voiceTranscript: string | null
  gestureTriggers: string[]
  gazeSamples: number
  gazeEngagedRatio: number
  fusionAttentionScore: number
  channelHints: {
    eyes: boolean
    gesture: boolean
    voice: boolean
  }
}

export type PopDemoLiteVoiceCommand =
  | 'open_wallet'
  | 'start_watch'
  | 'like'
  | 'open_feed'
  | 'open_promo'
  | 'save'
