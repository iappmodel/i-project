import { Capacitor } from '@capacitor/core'

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function capacitorPlatform(): string {
  return Capacitor.getPlatform()
}
