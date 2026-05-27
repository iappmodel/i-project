export function setCalibrationMode(active: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(new CustomEvent('calibrationMode', { detail: { active } }))
  } catch {
    // ignore
  }
}
