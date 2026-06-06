export type { PopDemoLiteTelemetry, PopDemoLiteVoiceCommand } from './types'
export { popDemoLiteStore } from './store'
export { computeFusionAttentionScore } from './fusion'
export { parsePopDemoLiteVoiceCommand } from './voiceCommands'

function envFlag(name: string): boolean {
  const raw = import.meta.env[name]
  if (typeof raw !== 'string') return false
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

/** POP Demo Lite — fused eyes + gesture + voice simulation (not production POPS authority). */
export function isPopDemoLiteEnabled(): boolean {
  return envFlag('VITE_POP_DEMO_LITE')
}
