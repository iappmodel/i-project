import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadTargets,
  saveTargets,
  TARGET_PRESETS,
  useScreenTargets,
  type ScreenTarget,
} from '../hooks/useScreenTargets'
import type { ComboAction } from '../hooks/useGestureCombos'

export type Loop1CommandHandlers = {
  onCommand: (command: ComboAction, target: ScreenTarget) => void
}

export function ensureLoop1ScreenTargets(): ScreenTarget[] {
  const existing = loadTargets()
  if (existing.length > 0) return existing

  const preset = TARGET_PRESETS.find((p) => p.id === 'navigation')
  if (!preset) return existing

  const seeded: ScreenTarget[] = preset.targets.map((t, index) => ({
    ...t,
    id: `loop1-nav-${index}-${Date.now()}`,
    createdAt: Date.now(),
  }))
  saveTargets(seeded)
  return seeded
}

function triggerMatches(target: ScreenTarget, gesture: string, blinkCount?: number): boolean {
  const trigger = target.trigger
  if (typeof trigger !== 'string') return false

  if (blinkCount != null) {
    if (trigger === 'singleBlink' && blinkCount === 1) return true
    if (trigger === 'doubleBlink' && blinkCount === 2) return true
    if (trigger === 'tripleBlink' && blinkCount === 3) return true
    if (trigger === 'bothBlink' && blinkCount === 1) return true
    return false
  }

  return trigger === gesture
}

/**
 * Maps remote gesture events to saved screen targets and executes Loop 1 commands.
 * No overlay UI — actionable blink/hand/head mapping only.
 */
export function useWebScreenTargetActions(enabled: boolean, handlers: Loop1CommandHandlers) {
  const { enabledTargets, recordInteraction } = useScreenTargets()
  const [lastAction, setLastAction] = useState<string | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!enabled) return
    ensureLoop1ScreenTargets()
  }, [enabled])

  const fireMatching = useCallback(
    (gesture: string, blinkCount?: number) => {
      const matches = enabledTargets.filter((target) => triggerMatches(target, gesture, blinkCount))
      if (matches.length === 0) return

      const target = matches[0]!
      handlersRef.current.onCommand(target.command, target)
      recordInteraction(target.id, true)
      setLastAction(`${target.label} → ${target.command}`)

      try {
        window.dispatchEvent(
          new CustomEvent('screenTargetAction', {
            detail: {
              command: target.command,
              targetId: target.id,
              label: target.label,
              gesture,
              blinkCount: blinkCount ?? null,
            },
          }),
        )
      } catch {
        // ignore
      }
    },
    [enabledTargets, recordInteraction],
  )

  useEffect(() => {
    if (!enabled) return

    const onGesture = (event: Event) => {
      const trigger = (event as CustomEvent<{ trigger?: string }>).detail?.trigger
      if (!trigger) return
      fireMatching(trigger)
    }

    const onBlink = (event: Event) => {
      const count = (event as CustomEvent<{ count?: number }>).detail?.count
      if (!count) return
      fireMatching('bothBlink', count)
    }

    window.addEventListener('remoteGestureTrigger', onGesture)
    window.addEventListener('remoteBlinkPattern', onBlink)
    return () => {
      window.removeEventListener('remoteGestureTrigger', onGesture)
      window.removeEventListener('remoteBlinkPattern', onBlink)
    }
  }, [enabled, fireMatching])

  return {
    targetCount: enabledTargets.length,
    lastAction,
  }
}

export function useScreenTargetActionListener(enabled: boolean) {
  const [lastAction, setLastAction] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: string; command?: string }>).detail
      if (!detail?.command) return
      const label = detail.label ?? detail.command
      setLastAction(`${label} → ${detail.command}`)
    }
    window.addEventListener('screenTargetAction', handler)
    return () => window.removeEventListener('screenTargetAction', handler)
  }, [enabled])

  return lastAction
}

export function executeLoop1Command(
  command: ComboAction,
  nav: {
    jumpWallet: () => void
    setActiveTab: (tab: 'feed' | 'earn' | 'profile') => void
    setScreen: (screen: 'saved') => void
    saveLoopItem: () => void
  },
) {
  switch (command) {
    case 'openWallet':
      nav.jumpWallet()
      break
    case 'promoFeed':
      nav.setActiveTab('earn')
      break
    case 'friendsFeed':
      nav.setActiveTab('feed')
      break
    case 'openProfile':
      nav.setActiveTab('profile')
      break
    case 'save':
      nav.saveLoopItem()
      nav.setScreen('saved')
      break
    case 'like':
    case 'comment':
    case 'share':
      try {
        window.dispatchEvent(
          new CustomEvent('screenTargetAction', {
            detail: { command, gesture: command },
          }),
        )
      } catch {
        /* non-browser */
      }
      break
    case 'nextVideo':
    case 'prevVideo':
    default:
      break
  }
}
