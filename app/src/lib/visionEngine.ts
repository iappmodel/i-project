import { detectVisionDeviceClass, getVisionRuntimePreset } from './visionCalibration/profile'
import { loadRemoteControlSettings } from './remoteControlSettings'
import { useVisionEngine } from '../vision-unified/hooks/useVisionEngine'
import { useEyeTracking } from '../vision-unified/hooks/useEyeTracking'
import {
  emitRemoteBlinkPattern,
  emitRemoteGesture,
  useWebGazeBroadcast,
  useWebGestureDispatch,
  type VisionGestureSlice,
} from './visionGestureBridge'
import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

export { useWebGestureDispatch, useRemoteGestureListener } from './visionGestureBridge'
export type { VisionGestureSlice } from './visionGestureBridge'

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

function useRemoteVisionSettings() {
  const [settings, setSettings] = useState(() => loadRemoteControlSettings())

  useEffect(() => {
    const onSettingsChanged = () => setSettings(loadRemoteControlSettings())
    window.addEventListener('remoteControlSettingsChanged', onSettingsChanged)
    return () => window.removeEventListener('remoteControlSettingsChanged', onSettingsChanged)
  }, [])

  return settings
}

export function useWebVisionEngine(enabled: boolean, videoRef: RefObject<HTMLVideoElement | null>) {
  const runtime = getWebVisionRuntime()
  const settings = useRemoteVisionSettings()
  const vision = useVisionEngine({
    enabled,
    videoRef: videoRef as RefObject<HTMLVideoElement>,
    mirrorX: settings.mirrorX,
    invertY: settings.invertY,
    gazeScale: settings.gazeReach,
    gazeSmoothing: runtime.preset.gazeSmoothing,
    visionBackend: settings.visionBackend ?? 'face_landmarker',
    patternTimeout: settings.blinkPatternTimeout,
    enableHandTracking: true,
    useWorker: true,
    onBlink: () => emitRemoteGesture('bothBlink'),
    onBlinkPattern: emitRemoteBlinkPattern,
    onLeftWink: () => emitRemoteGesture('leftWink'),
    onRightWink: () => emitRemoteGesture('rightWink'),
  })
  useWebGazeBroadcast(enabled, vision.gazePosition)
  const gestures = useWebGestureDispatch(enabled, vision as VisionGestureSlice)
  return { ...vision, ...gestures }
}

export function useWebEyeTracking(enabled: boolean) {
  return useEyeTracking({
    enabled,
    preset: 'normal',
  })
}
