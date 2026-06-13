import { useCallback, useMemo, useState } from 'react'
import { getButtonConfig } from '../../lib/gestureButtons/configStore'
import { loadRailOrder } from '../../lib/gestureButtons/layoutStore'
import { DEFAULT_RAIL_BUTTON_IDS } from '../../lib/gestureButtons/presets'
import type { ButtonInstanceConfig, OfferSession, WalletBalanceLimits } from '../../lib/gestureButtons/types'
import { GestureButton } from './GestureButton'
import { GestureButtonBuilderSheet } from './GestureButtonBuilderSheet'
import { GestureButtonSettingsSheet } from './GestureButtonSettingsSheet'

type Props = {
  onOfferReview?: (offer: OfferSession) => void
  onActionMessage?: (message: string) => void
  onOpenComments?: () => void
  onSave?: () => void
  onBuilderOpen?: () => void
  liked?: boolean
  likeCount?: number
  onLikeToggle?: (liked: boolean) => void
  balanceLimits?: WalletBalanceLimits
}

export function MediaActionRail({
  onOfferReview,
  onActionMessage,
  onOpenComments,
  onSave,
  onBuilderOpen,
  liked,
  likeCount,
  onLikeToggle,
  balanceLimits,
}: Props) {
  const railOrder = useMemo(() => loadRailOrder(), [])
  const [configs, setConfigs] = useState<Record<string, ButtonInstanceConfig>>(() => {
    const map: Record<string, ButtonInstanceConfig> = {}
    for (const id of railOrder) {
      map[id] = getButtonConfig(id)
    }
    for (const id of DEFAULT_RAIL_BUTTON_IDS) {
      if (!map[id]) map[id] = getButtonConfig(id)
    }
    return map
  })
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [builderSelectedId, setBuilderSelectedId] = useState<string | null>('like-love')

  const orderedIds = useMemo(() => {
    const seen = new Set<string>()
    const ids: string[] = []
    for (const id of railOrder) {
      if (configs[id]?.enabled !== false && !seen.has(id)) {
        ids.push(id)
        seen.add(id)
      }
    }
    for (const id of DEFAULT_RAIL_BUTTON_IDS) {
      if (!seen.has(id) && configs[id]?.enabled !== false) {
        ids.push(id)
        seen.add(id)
      }
    }
    return ids
  }, [configs, railOrder])

  const handleBuilderHold = useCallback(() => {
    setBuilderOpen(true)
    setBuilderSelectedId('controls')
    onBuilderOpen?.()
  }, [onBuilderOpen])

  return (
    <div className="media-action-rail" style={{ touchAction: 'none' }}>
      {orderedIds.map((id) => {
        const config = configs[id]
        if (!config || config.enabled === false) return null
        const isLike = id === 'like-love'
        const isControls = id === 'controls'
        return (
          <GestureButton
            key={id}
            config={config}
            showCrossMode={isLike}
            showLikeCount={isLike}
            liked={isLike ? liked : undefined}
            likeCount={isLike ? likeCount : undefined}
            onLikeToggle={isLike ? onLikeToggle : undefined}
            balanceLimits={isLike ? balanceLimits : undefined}
            onOpenSettings={() => setSettingsId(id)}
            callbacks={{
              onOfferReview,
              onBuilderHold: isControls ? handleBuilderHold : undefined,
              onAction: (action) => {
                if (action.type === 'share') onActionMessage?.('Share sheet (demo)')
                if (action.type === 'save') {
                  if (onSave) onSave()
                  else onActionMessage?.('Saved')
                }
                if (action.type === 'custom') {
                  if (action.id === 'open_comments') {
                    if (onOpenComments) onOpenComments()
                    else onActionMessage?.('Comments (demo)')
                  } else if (action.id === 'boost') onActionMessage?.('Boost (demo)')
                  else if (action.id === 'open_controls') {
                    setBuilderOpen(true)
                    setBuilderSelectedId('controls')
                  } else onActionMessage?.(`Action: ${action.id}`)
                }
              },
            }}
          />
        )
      })}
      {settingsId && configs[settingsId] ? (
        <GestureButtonSettingsSheet
          config={configs[settingsId]}
          open={!!settingsId}
          onClose={() => setSettingsId(null)}
          onSaved={(next) => setConfigs((prev) => ({ ...prev, [settingsId]: next }))}
        />
      ) : null}
      <GestureButtonBuilderSheet
        configs={configs}
        open={builderOpen}
        selectedId={builderSelectedId}
        onClose={() => setBuilderOpen(false)}
        onSelectButton={setBuilderSelectedId}
        onConfigsChange={setConfigs}
      />
    </div>
  )
}
