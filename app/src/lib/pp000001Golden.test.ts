import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { proofJsonPassesPrivacyGate } from './popPrivacyGate'

const fixturePath = resolve(
  import.meta.dirname,
  '../../../integrations/pop-core/fixtures/PP-000001.json',
)

describe('PP-000001 golden fixture', () => {
  it('loads and matches proof packet v0 shape', () => {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, unknown>
    expect(raw.packetVersion).toBe('0')
    expect(raw.sessionId).toBeTruthy()
    expect(raw.signals).toBeTruthy()
    expect(raw.review).toMatchObject({ status: 'pending' })
    expect(proofJsonPassesPrivacyGate(raw)).toBe(true)
  })

  it('eyeTracking has derived windows not raw meshes', () => {
    const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
      eyeTracking: Record<string, unknown>
    }
    expect(raw.eyeTracking.landmarks).toBeUndefined()
    expect(Array.isArray(raw.eyeTracking.stableGazeWindows)).toBe(true)
  })
})
