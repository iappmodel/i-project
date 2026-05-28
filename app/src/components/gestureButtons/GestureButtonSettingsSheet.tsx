import { useEffect, useState } from 'react'
import { resetButtonConfig, saveButtonConfig } from '../../lib/gestureButtons/configStore'
import type { ButtonAction, ButtonInstanceConfig, GestureTrigger } from '../../lib/gestureButtons/types'

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

function actionToValue(action: ButtonAction): string {
  if (action.type === 'tip') return action.coin === 'vicoin' ? 'tip-v' : 'tip-i'
  return action.type
}

type Props = {
  config: ButtonInstanceConfig
  open: boolean
  onClose: () => void
  onSaved: (config: ButtonInstanceConfig) => void
}

export function GestureButtonSettingsSheet({ config, open, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(config)

  useEffect(() => {
    if (open) setDraft(config)
  }, [open, config])

  if (!open) return null

  const setBinding = (trigger: GestureTrigger, value: string) => {
    const opt = ACTION_OPTIONS.find((o) => o.value === value)
    if (!opt) return
    const bindings = draft.bindings.filter((b) => b.trigger !== trigger)
    bindings.push({ trigger, action: opt.action })
    setDraft({ ...draft, bindings })
  }

  const bindingValue = (trigger: GestureTrigger) => {
    const b = draft.bindings.find((x) => x.trigger === trigger)
    return b ? actionToValue(b.action) : 'noop'
  }

  return (
    <div
      className="gesture-settings-backdrop"
      role="dialog"
      aria-label="Button settings"
      onClick={onClose}
    >
      <div className="gesture-settings-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{draft.label}</h2>
        <p className="gesture-settings-sheet__sub">
          Assign each gesture. Hold {draft.thresholds.armMs}ms to arm · deep {draft.thresholds.deepHoldMs}
          ms.
        </p>
        {TRIGGERS.map((t) => (
          <div key={t.id} className="gesture-settings-row">
            <label htmlFor={`bind-${t.id}`}>{t.label}</label>
            <select
              id={`bind-${t.id}`}
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
        <div className="gesture-settings-actions">
          <button
            type="button"
            className="ds-btn ds-btn--ghost"
            onClick={() => {
              const fresh = resetButtonConfig(draft.id)
              setDraft(fresh)
              onSaved(fresh)
            }}
          >
            Reset preset
          </button>
          <button
            type="button"
            className="ds-btn"
            onClick={() => {
              saveButtonConfig(draft)
              onSaved(draft)
              onClose()
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
