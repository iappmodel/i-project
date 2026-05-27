import { detectVisionDeviceClass, getVisionRuntimePreset, loadVisionCalibration } from './visionCalibration/profile'

export type RemoteControlProfile = 'adaptive' | 'precision' | 'speed'
export type VisionBackend = 'face_mesh' | 'face_landmarker'

export interface RemoteControlSettings {
  settingsVersion?: number
  enabled: boolean
  sensitivity: number
  gazeHoldTime: number
  blinkPatternTimeout: number
  ghostOpacity: number
  edgeThreshold: number
  rapidMovementEnabled: boolean
  gazeReach: number
  mirrorX: boolean
  invertY: boolean
  tiltEnabled: boolean
  tiltSensitivity: number
  visionBackend?: VisionBackend
  gazeBackend?: 'mediapipe' | 'gazecloud' | 'webgazer' | 'tobii_ws'
  controlProfile?: RemoteControlProfile
}

export const REMOTE_CONTROL_SETTINGS_KEY = 'app_remote_control_settings'

const DEFAULT_SETTINGS: RemoteControlSettings = {
  settingsVersion: 2,
  enabled: false,
  sensitivity: 5,
  gazeHoldTime: 800,
  blinkPatternTimeout: 600,
  ghostOpacity: 0.4,
  edgeThreshold: 0.35,
  rapidMovementEnabled: true,
  gazeReach: 1.6,
  mirrorX: true,
  invertY: true,
  tiltEnabled: false,
  tiltSensitivity: 5,
  controlProfile: 'adaptive',
}

export function loadRemoteControlSettings(): RemoteControlSettings {
  const calibration = loadVisionCalibration()
  const deviceClass = calibration.deviceClass ?? detectVisionDeviceClass()
  const preset = getVisionRuntimePreset(deviceClass)
  const defaults: RemoteControlSettings = {
    ...DEFAULT_SETTINGS,
    gazeHoldTime: preset.gazeHoldTime,
    edgeThreshold: preset.edgeThreshold,
    gazeReach: preset.gazeScale,
  }

  try {
    const saved = localStorage.getItem(REMOTE_CONTROL_SETTINGS_KEY)
    if (!saved) return defaults
    const parsed = JSON.parse(saved) as Partial<RemoteControlSettings>
    if (!parsed || typeof parsed !== 'object') return defaults
    return { ...defaults, ...parsed, settingsVersion: 2 }
  } catch {
    return defaults
  }
}
