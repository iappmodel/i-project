import { detectVisionDeviceClass, getVisionRuntimePreset } from './visionCalibration/profile'
import { useVisionEngine } from '../vision-unified/hooks/useVisionEngine'
import { useEyeTracking } from '../vision-unified/hooks/useEyeTracking'
import type { RefObject } from 'react'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

export function isWebVisionEnabled(): boolean {
  const raw = import.meta.env.VITE_VISION_ENGINE
  if (typeof raw !== 'string') return false
  return TRUE_VALUES.has(raw.trim().toLowerCase())
}

export function getWebVisionRuntime() {
  const deviceClass = detectVisionDeviceClass()
  return {
    deviceClass,
    preset: getVisionRuntimePreset(deviceClass),
  }
}

export function useWebVisionEngine(enabled: boolean, videoRef: RefObject<HTMLVideoElement | null>) {
  const runtime = getWebVisionRuntime()
  return useVisionEngine({
    enabled,
    videoRef: videoRef as RefObject<HTMLVideoElement>,
    gazeSmoothing: runtime.preset.gazeSmoothing,
    visionBackend: 'face_landmarker',
    useWorker: true,
  })
}

export function useWebEyeTracking(enabled: boolean) {
  return useEyeTracking({
    enabled,
    preset: 'normal',
  })
}
