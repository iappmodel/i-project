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
  /** POP Demo Lite — multi-signal simulation (not production authority). */
  popDemoLite: boolean
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
    popDemoLite: envFlag('VITE_POP_DEMO_LITE'),
  }
}

/** Flutter is sole production sensing runtime; web vision is hints-only. */
export function isPopProductionRuntimeFlutter(): boolean {
  return true
}

/** Android MVP ship gate: live wallet path without web vision authority. */
export function isPopMvpShipReady(flags: PopFeatureFlags = getPopFeatureFlags()): boolean {
  return !flags.popKillSwitch && isPopProductionRuntimeFlutter()
}

/** Admin / dev monitoring snapshot (no PII). */
export function getPopRolloutStatus(flags: PopFeatureFlags = getPopFeatureFlags()): {
  betaCohort: string | null
  killSwitch: boolean
  liveWallet: boolean
  telemetry: boolean
  autoSettleDemoOnly: boolean
  flutterProductionRuntime: boolean
  webVisionAuthority: boolean
  mvpShipReady: boolean
  demoLiteSimulation: boolean
} {
  return {
    betaCohort: flags.betaCohort,
    killSwitch: flags.popKillSwitch,
    liveWallet: flags.liveWallet,
    telemetry: flags.telemetry,
    autoSettleDemoOnly: flags.autoSettle,
    flutterProductionRuntime: isPopProductionRuntimeFlutter(),
    webVisionAuthority: false,
    mvpShipReady: isPopMvpShipReady(flags),
    demoLiteSimulation: flags.popDemoLite,
  }
}

/** Session-level telemetry — derived metrics only; never raw gaze stream. */
export function emitPopTelemetry(event: string, payload: Record<string, unknown>): void {
  const flags = getPopFeatureFlags()
  if (!flags.telemetry || flags.popKillSwitch) return
  const status = getPopRolloutStatus(flags)
  if (import.meta.env.DEV) {
    console.info(`[POP_TELEMETRY] ${event}`, {
      cohort: status.betaCohort,
      shipReady: status.mvpShipReady,
      ...payload,
    })
  }
}
