import type { PopDemoLiteTelemetry } from './types'
import { computeFusionAttentionScore } from './fusion'

type GestureEvent = { trigger: string; at: number }
type VoiceEvent = { command: string; transcript: string; at: number }
type GazeSample = { engaged: boolean; at: number }

const MAX_EVENTS = 48

class PopDemoLiteStore {
  private sessionId: string | null = null
  private gestures: GestureEvent[] = []
  private voiceEvents: VoiceEvent[] = []
  private gazeSamples: GazeSample[] = []

  reset(sessionId: string | null = null): void {
    this.sessionId = sessionId
    this.gestures = []
    this.voiceEvents = []
    this.gazeSamples = []
  }

  recordGesture(trigger: string): void {
    this.gestures.push({ trigger, at: Date.now() })
    if (this.gestures.length > MAX_EVENTS) this.gestures.shift()
  }

  recordVoice(command: string, transcript: string): void {
    this.voiceEvents.push({ command, transcript, at: Date.now() })
    if (this.voiceEvents.length > MAX_EVENTS) this.voiceEvents.shift()
  }

  recordGaze(engaged: boolean): void {
    this.gazeSamples.push({ engaged, at: Date.now() })
    if (this.gazeSamples.length > MAX_EVENTS) this.gazeSamples.shift()
  }

  getTelemetry(sessionAcsScore: number, sessionId?: string | null): PopDemoLiteTelemetry {
    const sid = sessionId ?? this.sessionId
    const lastVoice = this.voiceEvents[this.voiceEvents.length - 1] ?? null
    const engaged = this.gazeSamples.filter((s) => s.engaged).length
    const gazeEngagedRatio =
      this.gazeSamples.length > 0 ? engaged / this.gazeSamples.length : 0

    const channelHints = {
      eyes: this.gazeSamples.length > 0,
      gesture: this.gestures.length > 0,
      voice: this.voiceEvents.length > 0,
    }

    const fusionAttentionScore = computeFusionAttentionScore(sessionAcsScore, {
      gazeEngagedRatio,
      gestureCount: this.gestures.length,
      voiceCommand: lastVoice?.command ?? null,
    })

    return {
      sessionId: sid,
      voiceCommand: lastVoice?.command ?? null,
      voiceTranscript: lastVoice?.transcript ?? null,
      gestureTriggers: this.gestures.map((g) => g.trigger),
      gazeSamples: this.gazeSamples.length,
      gazeEngagedRatio,
      fusionAttentionScore,
      channelHints,
    }
  }
}

export const popDemoLiteStore = new PopDemoLiteStore()
