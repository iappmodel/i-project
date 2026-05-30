import { useCallback, useEffect, useRef, useState } from 'react'
import type { ComboAction } from '../hooks/useGestureCombos'
import {
  loadGestureCombos,
  stepsMatch,
  type ComboStep,
  type GestureComboRecord,
} from '../lib/gestureComboStore'
import { loadRemoteControlSettings } from '../lib/remoteControlSettings'

export type GestureComboMatchState = {
  progress: number
  activeCombo: GestureComboRecord | null
  lastExecuted: GestureComboRecord | null
}

function stepFromGesture(trigger: string): ComboStep {
  return { kind: 'gesture', value: trigger }
}

function stepFromBlink(count: number): ComboStep {
  return { kind: 'blink', value: String(count) }
}

/** Match saved gesture combos against remoteGestureTrigger / remoteBlinkPattern events. */
export function useGestureComboMatcher(
  enabled: boolean,
  onExecute: (action: ComboAction, combo: GestureComboRecord) => void,
) {
  const [state, setState] = useState<GestureComboMatchState>({
    progress: 0,
    activeCombo: null,
    lastExecuted: null,
  })
  const bufferRef = useRef<ComboStep[]>([])
  const lastStepAtRef = useRef(0)
  const onExecuteRef = useRef(onExecute)
  onExecuteRef.current = onExecute

  const resetBuffer = useCallback(() => {
    bufferRef.current = []
    setState((prev) => ({ ...prev, progress: 0, activeCombo: null }))
  }, [])

  const pushStep = useCallback(
    (step: ComboStep) => {
      const settings = loadRemoteControlSettings()
      const now = Date.now()
      if (lastStepAtRef.current && now - lastStepAtRef.current > settings.blinkPatternTimeout) {
        bufferRef.current = []
      }
      lastStepAtRef.current = now
      bufferRef.current = [...bufferRef.current, step]

      const combos = loadGestureCombos().filter((c) => c.enabled)
      const buf = bufferRef.current

      for (const combo of combos) {
        if (buf.length > combo.steps.length) continue
        const prefix = combo.steps.slice(0, buf.length)
        if (!stepsMatch(buf, prefix)) continue

        if (buf.length === combo.steps.length) {
          onExecuteRef.current(combo.action, combo)
          setState({ progress: 1, activeCombo: combo, lastExecuted: combo })
          bufferRef.current = []
          try {
            window.dispatchEvent(
              new CustomEvent('gestureComboExecuted', {
                detail: { comboId: combo.id, name: combo.name, action: combo.action },
              }),
            )
          } catch {
            // ignore
          }
          window.setTimeout(resetBuffer, settings.blinkPatternTimeout)
          return
        }

        setState({
          progress: buf.length / combo.steps.length,
          activeCombo: combo,
          lastExecuted: null,
        })
        return
      }

      if (buf.length > 3) resetBuffer()
    },
    [resetBuffer],
  )

  useEffect(() => {
    if (!enabled) {
      resetBuffer()
      return
    }

    const onGesture = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: string }>).detail?.trigger
      if (!trigger) return
      pushStep(stepFromGesture(trigger))
    }

    const onBlink = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count
      if (!count) return
      pushStep(stepFromBlink(count))
    }

    window.addEventListener('remoteGestureTrigger', onGesture)
    window.addEventListener('remoteBlinkPattern', onBlink)
    return () => {
      window.removeEventListener('remoteGestureTrigger', onGesture)
      window.removeEventListener('remoteBlinkPattern', onBlink)
    }
  }, [enabled, pushStep, resetBuffer])

  return state
}
