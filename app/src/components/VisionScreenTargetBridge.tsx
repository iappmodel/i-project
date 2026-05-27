import { isWebVisionEnabled } from '../lib/visionEngine'
import { saveLoopItem } from '../lib/savedLoop'
import { executeLoop1Command, useWebScreenTargetActions } from '../lib/visionScreenTargets'
import { useDemo } from '../state/useDemo'

/** Global listener: maps remote gestures to saved screen targets (no overlay UI). */
export function VisionScreenTargetBridge() {
  const enabled = isWebVisionEnabled()
  const { jumpWallet, setActiveTab, setScreen } = useDemo()

  useWebScreenTargetActions(enabled, {
    onCommand: (command) => {
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
    },
  })

  return null
}
