import { useCallback } from 'react'
import { useGestureComboMatcher } from '../hooks/useGestureComboMatcher'
import { executeLoop1Command } from '../lib/visionScreenTargets'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { saveLoopItem } from '../lib/savedLoop'
import { useDemo } from '../state/useDemo'

/** Global combo matcher — runs when VITE_VISION_ENGINE=1. */
export function GestureComboMatcherHost() {
  const enabled = isWebVisionEnabled()
  const { jumpWallet, setActiveTab, setScreen } = useDemo()

  const onExecute = useCallback(
    (action: Parameters<typeof executeLoop1Command>[0], _combo: { name: string }) => {
      executeLoop1Command(action, {
        jumpWallet,
        setActiveTab,
        setScreen,
        saveLoopItem: () => {
          saveLoopItem({
            id: `vision-combo-${Date.now()}`,
            title: `Saved via combo · ${_combo.name}`,
            source: 'Gesture combo',
            savedAt: Date.now(),
          })
        },
      })
    },
    [jumpWallet, setActiveTab, setScreen],
  )

  useGestureComboMatcher(enabled, onExecute)
  return null
}
