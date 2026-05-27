import { normalizeResidualModel, type VisionResidualModel } from './residualModel'

export type VisionDeviceClass = 'iphone' | 'android' | 'desktop'

export interface VisionRuntimePreset {
  gazeScale: number
  gazeSmoothing: number
  pointerResponse: number
  gazeHoldTime: number
  edgeThreshold: number
}

export interface VisionCalibrationProfile {
  isCalibrated: boolean
  calibratedAt: number
  version: 2
  profileQuality: number
  livenessMinScore: number
  residualModel?: VisionResidualModel
  deviceClass?: VisionDeviceClass
}

export const VISION_CALIBRATION_STORAGE_KEY = 'app_remote_control_calibration'

const DEFAULT_CALIBRATION: VisionCalibrationProfile = {
  isCalibrated: false,
  calibratedAt: 0,
  version: 2,
  profileQuality: 0.5,
  livenessMinScore: 0.55,
  deviceClass: 'desktop',
}

const RUNTIME_PRESETS: Record<VisionDeviceClass, VisionRuntimePreset> = {
  iphone: { gazeScale: 1.55, gazeSmoothing: 0.2, pointerResponse: 0.35, gazeHoldTime: 720, edgeThreshold: 0.33 },
  android: { gazeScale: 1.5, gazeSmoothing: 0.28, pointerResponse: 0.3, gazeHoldTime: 820, edgeThreshold: 0.36 },
  desktop: { gazeScale: 1.7, gazeSmoothing: 0.24, pointerResponse: 0.34, gazeHoldTime: 760, edgeThreshold: 0.34 },
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const asDeviceClass = (value: unknown): VisionDeviceClass | null =>
  value === 'iphone' || value === 'android' || value === 'desktop' ? value : null

export function detectVisionDeviceClass(): VisionDeviceClass {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = (navigator.userAgent || '').toLowerCase()
  const touch = Number.isFinite(navigator.maxTouchPoints) ? navigator.maxTouchPoints : 0
  const isIpad = ua.includes('ipad') || (ua.includes('macintosh') && touch > 1)
  if (ua.includes('android')) return 'android'
  if (ua.includes('iphone') || ua.includes('ipod') || isIpad) return 'iphone'
  return 'desktop'
}

export function getVisionRuntimePreset(deviceClass: VisionDeviceClass = detectVisionDeviceClass()): VisionRuntimePreset {
  return RUNTIME_PRESETS[deviceClass]
}

export function normalizeVisionCalibration(value: unknown): VisionCalibrationProfile {
  if (!value || typeof value !== 'object') return { ...DEFAULT_CALIBRATION, deviceClass: detectVisionDeviceClass() }
  const obj = value as Record<string, unknown>
  const deviceClass = asDeviceClass(obj.deviceClass) ?? detectVisionDeviceClass()
  return {
    isCalibrated: obj.isCalibrated === true,
    calibratedAt: typeof obj.calibratedAt === 'number' ? obj.calibratedAt : 0,
    version: 2,
    profileQuality: clamp01(typeof obj.profileQuality === 'number' ? obj.profileQuality : DEFAULT_CALIBRATION.profileQuality),
    livenessMinScore: clamp01(
      typeof obj.livenessMinScore === 'number' ? obj.livenessMinScore : DEFAULT_CALIBRATION.livenessMinScore,
    ),
    residualModel: normalizeResidualModel(obj.residualModel),
    deviceClass,
  }
}

export function loadVisionCalibration(): VisionCalibrationProfile {
  if (typeof window === 'undefined') return { ...DEFAULT_CALIBRATION, deviceClass: detectVisionDeviceClass() }
  try {
    const raw = window.localStorage.getItem(VISION_CALIBRATION_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CALIBRATION, deviceClass: detectVisionDeviceClass() }
    return normalizeVisionCalibration(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_CALIBRATION, deviceClass: detectVisionDeviceClass() }
  }
}

export function saveVisionCalibration(value: VisionCalibrationProfile): void {
  if (typeof window === 'undefined') return
  const normalized = normalizeVisionCalibration(value)
  window.localStorage.setItem(VISION_CALIBRATION_STORAGE_KEY, JSON.stringify(normalized))
}
