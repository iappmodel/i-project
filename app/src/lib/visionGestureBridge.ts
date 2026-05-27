import { useEffect, useRef, useState } from 'react'
import { useVision } from '../contexts/VisionContext'
import type { VisionState } from '../hooks/useVisionEngine'

export type VisionGestureSlice = Pick<
  VisionState,
  | 'isRunning'
  | 'handGesture'
  | 'lastHandGestureTime'
  | 'commandIntent'
  | 'lastCommandTime'
  | 'blinkCount'
  | 'lastBlinkTime'
>

export function emitRemoteGesture(trigger: string) {
  try {
    window.dispatchEvent(
      new CustomEvent('remoteGestureTrigger', {
        detail: { trigger, timestamp: Date.now() },
      }),
    )
  } catch {
    // ignore
  }
}

export function emitRemoteBlinkPattern(count: number) {
  try {
    window.dispatchEvent(
      new CustomEvent('remoteBlinkPattern', {
        detail: { count, timestamp: Date.now() },
      }),
    )
  } catch {
    // ignore
  }
  if (count === 1) emitRemoteGesture('bothBlink')
}

/**
 * Narrow gesture-dispatch slice from blink-remote runtime (no calibration UI).
 * Uses VisionContext when available, or an explicit vision state override (Earn path).
 */
export function useWebGestureDispatch(enabled: boolean, visionOverride?: VisionGestureSlice | null) {
  const visionCtx = useVision()
  const vision = visionOverride ?? visionCtx?.visionState ?? null
  const [lastGesture, setLastGesture] = useState<string | null>(null)
  const lastHandEventRef = useRef(0)
  const lastCommandEventRef = useRef(0)
  const lastBlinkEventRef = useRef(0)

  useEffect(() => {
    if (!enabled || visionOverride || !visionCtx) return

    visionCtx.registerBlinkHandlers({
      onBlink: () => {
        emitRemoteGesture('bothBlink')
        setLastGesture('bothBlink')
      },
      onBlinkPattern: (count) => {
        emitRemoteBlinkPattern(count)
        setLastGesture(`blinkPattern:${count}`)
      },
      onLeftWink: () => {
        emitRemoteGesture('leftWink')
        setLastGesture('leftWink')
      },
      onRightWink: () => {
        emitRemoteGesture('rightWink')
        setLastGesture('rightWink')
      },
    })

    return () => visionCtx.registerBlinkHandlers(null)
  }, [enabled, visionCtx, visionOverride])

  useEffect(() => {
    if (!enabled || !vision) return

    const handTs = vision.lastHandGestureTime ?? 0
    if (handTs > lastHandEventRef.current) {
      lastHandEventRef.current = handTs
      if (vision.handGesture === 'pinch') {
        emitRemoteGesture('handPinch')
        setLastGesture('handPinch')
      } else if (vision.handGesture === 'point') {
        emitRemoteGesture('handPoint')
        setLastGesture('handPoint')
      } else if (vision.handGesture === 'openPalm') {
        emitRemoteGesture('handOpenPalm')
        setLastGesture('handOpenPalm')
      }
    }

    const cmdTs = vision.lastCommandTime ?? 0
    if (cmdTs > lastCommandEventRef.current) {
      lastCommandEventRef.current = cmdTs
      if (vision.commandIntent === 'select') {
        emitRemoteGesture('handPinch')
        setLastGesture('handPinch')
      } else if (vision.commandIntent === 'confirm') {
        emitRemoteGesture('headNod')
        setLastGesture('headNod')
      } else if (vision.commandIntent === 'next') {
        emitRemoteGesture('faceTurnRight')
        setLastGesture('faceTurnRight')
      } else if (vision.commandIntent === 'previous') {
        emitRemoteGesture('faceTurnLeft')
        setLastGesture('faceTurnLeft')
      }
    }

    const blinkTs = vision.lastBlinkTime ?? 0
    if (blinkTs > lastBlinkEventRef.current) {
      lastBlinkEventRef.current = blinkTs
      emitRemoteGesture('bothBlink')
      setLastGesture('bothBlink')
    }
  }, [
    enabled,
    vision?.handGesture,
    vision?.lastHandGestureTime,
    vision?.commandIntent,
    vision?.lastCommandTime,
    vision?.lastBlinkTime,
  ])

  return {
    lastGesture,
    visionActive: Boolean(vision?.isRunning),
  }
}

/** Passive listener for screens that only display the latest gesture event. */
export function useRemoteGestureListener(enabled: boolean) {
  const [lastGesture, setLastGesture] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const handler = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: string }>).detail?.trigger
      if (trigger) setLastGesture(trigger)
    }
    window.addEventListener('remoteGestureTrigger', handler)
    return () => window.removeEventListener('remoteGestureTrigger', handler)
  }, [enabled])

  return lastGesture
}
