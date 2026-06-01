import { useEffect, useState } from 'react'
import { Button } from './Button'
import { COMBO_ACTION_LABELS, type ComboAction } from '../hooks/useGestureCombos'
import { TRIGGER_LABELS } from '../hooks/useScreenTargets'
import {
  describeComboStep,
  saveGestureCombo,
  type ComboStep,
  type GestureComboRecord,
} from '../lib/gestureComboStore'

const BLINK_STEP_OPTIONS: ComboStep[] = [
  { kind: 'blink', value: '1' },
  { kind: 'blink', value: '2' },
  { kind: 'blink', value: '3' },
]

const GESTURE_STEP_OPTIONS: ComboStep[] = (
  [
    'leftWink',
    'rightWink',
    'bothBlink',
    'handPinch',
    'handPoint',
    'headNod',
    'faceTurnLeft',
    'faceTurnRight',
  ] as const
).map((value) => ({ kind: 'gesture' as const, value }))

function stepKey(step: ComboStep): string {
  return `${step.kind}:${step.value}`
}

type Props = {
  open: boolean
  editCombo: GestureComboRecord | null
  onClose: () => void
  onSaved: () => void
}

export function GestureComboBuilderSheet({ open, editCombo, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [action, setAction] = useState<ComboAction>('like')
  const [steps, setSteps] = useState<ComboStep[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(editCombo?.name ?? '')
    setAction(editCombo?.action ?? 'like')
    setSteps(editCombo?.steps ?? [{ kind: 'blink', value: '2' }])
    setError(null)
  }, [open, editCombo])

  if (!open) return null

  const addStep = (step: ComboStep) => {
    if (steps.length >= 4) {
      setError('Max 4 steps per combo')
      return
    }
    setSteps((prev) => [...prev, step])
    setError(null)
  }

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const moveStep = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= steps.length) return
    setSteps((prev) => {
      const copy = [...prev]
      const tmp = copy[index]!
      copy[index] = copy[next]!
      copy[next] = tmp
      return copy
    })
  }

  const handleSave = () => {
    if (!name.trim()) {
      setError('Name required')
      return
    }
    if (steps.length === 0) {
      setError('Add at least one step')
      return
    }
    saveGestureCombo({
      id: editCombo?.id,
      name: name.trim(),
      steps,
      action,
      enabled: editCombo?.enabled ?? true,
    })
    onSaved()
    onClose()
  }

  return (
    <div className="combo-builder-backdrop" role="dialog" aria-label="Combo builder" onClick={onClose}>
      <div className="combo-builder-sheet" onClick={(e) => e.stopPropagation()}>
        <p className="combo-builder-sheet__eyebrow">BLINK REMOTE</p>
        <h2 className="combo-builder-sheet__title">{editCombo ? 'Edit combo' : 'New combo'}</h2>
        <p className="combo-builder-sheet__sub">Perform steps in order within pattern timeout.</p>

        <label className="combo-builder-field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            maxLength={48}
            onChange={(e) => setName(e.target.value)}
            placeholder="Double blink → Like"
          />
        </label>

        <label className="combo-builder-field">
          <span>Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value as ComboAction)}>
            {(Object.keys(COMBO_ACTION_LABELS) as ComboAction[]).map((key) => (
              <option key={key} value={key}>
                {COMBO_ACTION_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <div className="combo-builder-steps">
          <p className="combo-builder-steps__label">Steps ({steps.length}/4)</p>
          <ol className="combo-builder-steps__list">
            {steps.map((step, index) => (
              <li key={`${stepKey(step)}-${index}`} className="combo-builder-steps__item">
                <span className="mono">{describeComboStep(step)}</span>
                <span className="combo-builder-steps__actions">
                  <button type="button" onClick={() => moveStep(index, -1)} aria-label="Move up">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveStep(index, 1)} aria-label="Move down">
                    ↓
                  </button>
                  <button type="button" onClick={() => removeStep(index)} aria-label="Remove">
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="combo-builder-add">
          <p className="combo-builder-add__label">Add step</p>
          <div className="combo-builder-add__chips">
            {BLINK_STEP_OPTIONS.map((step) => (
              <button key={stepKey(step)} type="button" className="combo-builder-chip" onClick={() => addStep(step)}>
                {describeComboStep(step)}
              </button>
            ))}
          </div>
          <div className="combo-builder-add__chips">
            {GESTURE_STEP_OPTIONS.map((step) => (
              <button key={stepKey(step)} type="button" className="combo-builder-chip" onClick={() => addStep(step)}>
                {TRIGGER_LABELS[step.value as keyof typeof TRIGGER_LABELS] ?? step.value}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="combo-builder-error mono">{error}</p> : null}

        <div className="combo-builder-actions">
          <Button onClick={handleSave}>{editCombo ? 'Save combo' : 'Create combo'}</Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
