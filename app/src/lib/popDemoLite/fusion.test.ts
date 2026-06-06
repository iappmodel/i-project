import { describe, expect, it } from 'vitest'
import { computeFusionAttentionScore } from './fusion'
import { parsePopDemoLiteVoiceCommand } from './voiceCommands'

describe('computeFusionAttentionScore', () => {
  it('blends session ACS with multi-signal channels', () => {
    const fused = computeFusionAttentionScore(80, {
      gazeEngagedRatio: 1,
      gestureCount: 3,
      voiceCommand: 'like',
    })
    expect(fused).toBe(53)
    expect(fused).toBeLessThan(80)
  })

  it('clamps to 0–100', () => {
    expect(
      computeFusionAttentionScore(0, {
        gazeEngagedRatio: 0,
        gestureCount: 0,
        voiceCommand: null,
      }),
    ).toBe(0)
    expect(
      computeFusionAttentionScore(100, {
        gazeEngagedRatio: 1,
        gestureCount: 10,
        voiceCommand: 'open_wallet',
      }),
    ).toBe(66)
  })
})

describe('parsePopDemoLiteVoiceCommand', () => {
  it('maps wallet and watch intents', () => {
    expect(parsePopDemoLiteVoiceCommand('open wallet please')).toBe('open_wallet')
    expect(parsePopDemoLiteVoiceCommand('start watch now')).toBe('start_watch')
  })

  it('maps feed promo and like intents', () => {
    expect(parsePopDemoLiteVoiceCommand('go to feed')).toBe('open_feed')
    expect(parsePopDemoLiteVoiceCommand('open promo')).toBe('open_promo')
    expect(parsePopDemoLiteVoiceCommand('like this video')).toBe('like')
  })

  it('returns null for unrecognized speech', () => {
    expect(parsePopDemoLiteVoiceCommand('hello world')).toBeNull()
  })
})
