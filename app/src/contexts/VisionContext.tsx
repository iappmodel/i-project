import type { ReactNode, RefObject } from 'react'
import type { VisionState } from '@/hooks/useVisionEngine'

export const USE_VISION_CONTEXT: boolean = false

export interface VisionContextValue {
  visionState: VisionState
  videoRef: RefObject<HTMLVideoElement | null>
  isActive: boolean
  requestCamera: () => () => void
  startCamera: () => Promise<void>
  stopCamera: () => void
  needsUserGesture: boolean
  clearNeedsUserGesture: () => void
  registerBlinkHandlers: (handlers: unknown) => void
}

export function useVision(): VisionContextValue | null {
  return null
}

export function VisionProvider({ children }: { children: ReactNode }) {
  return children
}
