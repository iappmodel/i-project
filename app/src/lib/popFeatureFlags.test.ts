import { describe, expect, it, vi } from 'vitest'
import { emitPopTelemetry, getPopFeatureFlags, getPopRolloutStatus } from './popFeatureFlags'

describe('popFeatureFlags', () => {
  it('blocks telemetry when kill switch is on', () => {
    vi.stubEnv('VITE_POP_KILL_SWITCH', 'true')
    vi.stubEnv('VITE_POP_TELEMETRY', 'true')
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    emitPopTelemetry('test_event', { ok: true })
    expect(log).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
    log.mockRestore()
  })

  it('rollout status reports cohort and paths', () => {
    vi.stubEnv('VITE_POP_BETA_COHORT', 'android-mvp')
    const status = getPopRolloutStatus()
    expect(status.betaCohort).toBe('android-mvp')
    expect(status.flutterProductionRuntime).toBe(true)
    expect(status.webVisionAuthority).toBe(false)
    vi.unstubAllEnvs()
  })

  it('autoSettle is demo-only flag surface', () => {
    const flags = getPopFeatureFlags()
    expect(typeof flags.autoSettle).toBe('boolean')
    expect(typeof flags.liveWallet).toBe('boolean')
  })
})
