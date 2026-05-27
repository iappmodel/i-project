import { useCallback, useEffect } from 'react'
import { TargetOverlay } from '../vision-unified/components/TargetOverlay'
import { useVision } from '../contexts/VisionContext'
import type { ComboAction } from '../hooks/useGestureCombos'
import { saveLoopItem } from '../lib/savedLoop'
import { useWebGazeBroadcast } from '../lib/visionGestureBridge'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { ensureLoop1ScreenTargets, executeLoop1Command } from '../lib/visionScreenTargets'
import { useDemo } from '../state/useDemo'

function toPixelGaze(normalized: { x: number; y: number } | null | undefined) {
  if (!normalized || typeof window === 'undefined') return null
  return {
    x: normalized.x * window.innerWidth,
    y: normalized.y * window.innerHeight,
  }
}

/** Gaze-dwell target overlay (no blink-remote settings panel). */
export function VisionTargetOverlay() {
  const enabled = isWebVisionEnabled()
  const visionCtx = useVision()
  const gazeNorm = visionCtx?.visionState?.gazePosition ?? null
  const gazePosition = toPixelGaze(gazeNorm)

  useWebGazeBroadcast(enabled, gazeNorm)
  const { jumpWallet, setActiveTab, setScreen } = useDemo()

  useEffect(() => {
    if (!enabled) return
    ensureLoop1ScreenTargets()
  }, [enabled])

  const onTargetAction = useCallback(
    (command: ComboAction) => {
      executeLoop1Command(command, {
        jumpWallet,
        setActiveTab,
        setScreen,
        saveLoopItem: () => {
          saveLoopItem({
            id: `vision-target-${Date.now()}`,
            title: 'Saved via vision target',
            source: 'Screen target',
            savedAt: Date.now(),
          })
        },
      })

      try {
        window.dispatchEvent(
          new CustomEvent('screenTargetAction', {
            detail: { command, label: command, source: 'targetOverlay' },
          }),
        )
      } catch {
        // ignore
      }
    },
    [jumpWallet, setActiveTab, setScreen],
  )

  if (!enabled) return null

  return (
    <TargetOverlay
      enabled={enabled}
      gazePosition={gazePosition}
      showGazeCursor
      showCalibrationHint
      onTargetAction={onTargetAction}
    />
  )
}
