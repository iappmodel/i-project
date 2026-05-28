import { useEffect, useState } from 'react'
import {
  resetButtonConfig,
  saveButtonConfig,
  upsertButtonConfig,
} from '../../lib/gestureButtons/configStore'
import { addUserButtonId } from '../../lib/gestureButtons/layoutStore'
import type { ButtonAction, ButtonInstanceConfig, GestureTrigger } from '../../lib/gestureButtons/types'
import { ButtonPresetGallery } from './ButtonPresetGallery'

const TRIGGERS: { id: GestureTrigger; label: string }[] = [
  { id: 'tap', label: 'Tap' },
  { id: 'double_tap', label: 'Double tap' },
  { id: 'triple_tap', label: 'Triple tap' },
  { id: 'swipe_up', label: 'Swipe up' },
  { id: 'swipe_down', label: 'Swipe down' },
  { id: 'swipe_left', label: 'Swipe left' },
  { id: 'swipe_right', label: 'Swipe right' },
]

const ACTION_OPTIONS: { value: string; label: string; action: ButtonAction }[] = [
  { value: 'like', label: 'Like', action: { type: 'like' } },
  { value: 'tip-v', label: 'Tip Vicoin', action: { type: 'tip', coin: 'vicoin' } },
  { value: 'tip-i', label: 'Tip Icoin', action: { type: 'tip', coin: 'icoin' } },
  { value: 'save', label: 'Save', action: { type: 'save' } },
  { value: 'share', label: 'Share', action: { type: 'share' } },
  { value: 'noop', label: 'None', action: { type: 'noop' } },
]

const RAMP_PRESETS = ['gentle', 'standard', 'aggressive'] as const

function actionToValue(action: ButtonAction): string {
  if (action.type === 'tip') return action.coin === 'vicoin' ? 'tip-v' : 'tip-i'
  return action.type
}

function clonePreset(preset: ButtonInstanceConfig): ButtonInstanceConfig {
  return JSON.parse(JSON.stringify(preset)) as ButtonInstanceConfig
}

type Props = {
  configs: Record<string, ButtonInstanceConfig>
  open: boolean
  selectedId: string | null
  onClose: () => void
  onConfigsChange: (configs: Record<string, ButtonInstanceConfig>) => void
  onSelectButton: (id: string) => void
}

export function GestureButtonBuilderSheet({
  configs,
  open,
  selectedId,
  onClose,
  onConfigsChange,
  onSelectButton,
}: Props) {
  const [draft, setDraft] = useState<ButtonInstanceConfig | null>(null)

  useEffect(() => {
    if (!open || !selectedId) {
      setDraft(null)
      return
    }
    const cfg = configs[selectedId]
    if (cfg) setDraft(clonePreset(cfg))
  }, [open, selectedId, configs])

  if (!open) return null

  const setBinding = (trigger: GestureTrigger, value: string) => {
    if (!draft) return
    const opt = ACTION_OPTIONS.find((o) => o.value === value)
    if (!opt) return
    const bindings = draft.bindings.filter((b) => b.trigger !== trigger)
    bindings.push({ trigger, action: opt.action })
    setDraft({ ...draft, bindings })
  }

  const bindingValue = (trigger: GestureTrigger) => {
    const b = draft?.bindings.find((x) => x.trigger === trigger)
    return b ? actionToValue(b.action) : 'noop'
  }

  const persistDraft = () => {
    if (!draft) return
    const saved = upsertButtonConfig(draft)
    onConfigsChange({ ...configs, [saved.id]: saved })
    setDraft(saved)
  }

  const addFromPreset = (preset: ButtonInstanceConfig) => {
    const id = addUserButtonId()
    const next = upsertButtonConfig({
      ...clonePreset(preset),
      id,
      presetId: preset.presetId,
      label: preset.label,
    })
    onConfigsChange({ ...configs, [id]: next })
    onSelectButton(id)
  }

  return (
    <div
      className="gesture-builder-backdrop"
      role="dialog"
      aria-label="Gesture button builder"
      onClick={onClose}
    >
      <div className="gesture-builder-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="gesture-builder-sheet__head">
          <h2>Controls</h2>
          <p>Long-press CONTROLS to open · assign gestures per button</p>
        </header>

        <div className="gesture-builder-rail-pick">
          {Object.values(configs).map((cfg) => (
            <button
              key={cfg.id}
              type="button"
              className={`gesture-builder-rail-btn ${selectedId === cfg.id ? 'gesture-builder-rail-btn--active' : ''}`}
              onClick={() => onSelectButton(cfg.id)}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {draft ? (
          <>
            <div className="gesture-builder-cross" aria-hidden>
              <span className="gesture-builder-cross__arm gesture-builder-cross__arm--up" />
              <span className="gesture-builder-cross__arm gesture-builder-cross__arm--down" />
              <span className="gesture-builder-cross__arm gesture-builder-cross__arm--left" />
              <span className="gesture-builder-cross__arm gesture-builder-cross__arm--right" />
              <span className="gesture-builder-cross__hub" />
            </div>

            {TRIGGERS.map((t) => (
              <div key={t.id} className="gesture-settings-row">
                <label htmlFor={`builder-${t.id}`}>{t.label}</label>
                <select
                  id={`builder-${t.id}`}
                  value={bindingValue(t.id)}
                  onChange={(e) => setBinding(t.id, e.target.value)}
                >
                  {ACTION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="gesture-settings-row">
              <label htmlFor="builder-arm">Arm (ms)</label>
              <input
                id="builder-arm"
                type="number"
                min={200}
                max={2000}
                value={draft.thresholds.armMs}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: { ...draft.thresholds, armMs: Number(e.target.value) || 500 },
                  })
                }
              />
            </div>
            <div className="gesture-settings-row">
              <label htmlFor="builder-deep">Deep hold (ms)</label>
              <input
                id="builder-deep"
                type="number"
                min={1000}
                max={8000}
                value={draft.thresholds.deepHoldMs}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: { ...draft.thresholds, deepHoldMs: Number(e.target.value) || 3000 },
                  })
                }
              />
            </div>
            <div className="gesture-settings-row">
              <label htmlFor="builder-ramp">Ramp</label>
              <select
                id="builder-ramp"
                value={draft.ramp.preset}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    ramp: {
                      ...draft.ramp,
                      preset: e.target.value as (typeof RAMP_PRESETS)[number],
                    },
                  })
                }
              >
                {RAMP_PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="gesture-settings-actions">
              <button
                type="button"
                className="ds-btn ds-btn--ghost"
                onClick={() => {
                  const fresh = resetButtonConfig(draft.id)
                  setDraft(fresh)
                  onConfigsChange({ ...configs, [fresh.id]: fresh })
                }}
              >
                Reset preset
              </button>
              <button
                type="button"
                className="ds-btn"
                onClick={() => {
                  saveButtonConfig(draft)
                  persistDraft()
                }}
              >
                Save button
              </button>
            </div>
          </>
        ) : (
          <p className="gesture-builder-sheet__hint">Select a rail button to edit bindings</p>
        )}

        <h3 className="gesture-builder-sheet__gallery-title">Add preset</h3>
        <ButtonPresetGallery onSelect={addFromPreset} />
      </div>
    </div>
  )
}
