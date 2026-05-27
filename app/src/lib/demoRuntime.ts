export function isDemoVisionSimulationEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const raw = import.meta.env.VITE_VISION_ENGINE
  if (typeof raw === 'string' && ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())) {
    return false
  }
  return import.meta.env.DEV
}

export function getCameraRuntimeIssue(): string | null {
  if (typeof window === 'undefined') return null
  if (!window.isSecureContext) {
    return 'Camera requires HTTPS (or localhost).'
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Camera API is not available in this browser.'
  }
  return null
}
