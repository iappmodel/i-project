/** POP production feature flags (Stage 9). */
export interface PopFeatureFlags {
  /** Real MediaPipe vision pipeline when true. */
  visionEngine: boolean
  /** Live POP validator + wallet sync. */
  liveWallet: boolean
  /** Auto-settle pending holds after proof submit. */
  autoSettle: boolean
  /** Emit anonymized POP telemetry (no biometrics). */
  telemetry: boolean
  /** Kill switch — blocks proof submit when true. */
  popKillSwitch: boolean
  /** Beta cohort label for rollout tracking. */
  betaCohort: string | null
}

function envFlag(name: string, defaultValue = false): boolean {
  const raw = import.meta.env[name]
  if (typeof raw !== 'string') return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

export function getPopFeatureFlags(): PopFeatureFlags {
  return {
    visionEngine: envFlag('VITE_VISION_ENGINE'),
    liveWallet: Boolean(import.meta.env.VITE_POP_VALIDATOR_URL),
    autoSettle: envFlag('VITE_AUTO_SETTLE'),
    telemetry: envFlag('VITE_POP_TELEMETRY', import.meta.env.DEV),
    popKillSwitch: envFlag('VITE_POP_KILL_SWITCH'),
    betaCohort: import.meta.env.VITE_POP_BETA_COHORT?.trim() || null,
  }
}

/** Session-level telemetry — derived metrics only; never raw gaze stream. */
export function emitPopTelemetry(event: string, payload: Record<string, unknown>): void {
  const flags = getPopFeatureFlags()
  if (!flags.telemetry || flags.popKillSwitch) return
  if (import.meta.env.DEV) {
    console.info(`[POP_TELEMETRY] ${event}`, { cohort: flags.betaCohort, ...payload })
  }
}
