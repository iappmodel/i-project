import { useMemo, useState } from 'react'
import { Button } from './Button'
import {
  TRIGGER_LABELS,
  useScreenTargets,
  type AppCommand,
  type ScreenTarget,
  type SimpleGestureTrigger,
} from '../hooks/useScreenTargets'
import { COMBO_ACTION_LABELS } from '../hooks/useGestureCombos'

type Props = {
  className?: string
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

const SIMPLE_TRIGGERS = Object.keys(TRIGGER_LABELS) as SimpleGestureTrigger[]
const COMMANDS = Object.keys(COMBO_ACTION_LABELS) as AppCommand[]

function TargetEditorRow({
  target,
  onUpdate,
  onRemove,
}: {
  target: ScreenTarget
  onUpdate: (id: string, updates: Partial<ScreenTarget>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 10,
        padding: 10,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={target.label}
          onChange={(event) => onUpdate(target.id, { label: event.target.value.slice(0, 24) })}
          style={{ flex: 1 }}
        />
        <label className="profile-trust-card__hint mono" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={target.enabled}
            onChange={(event) => onUpdate(target.id, { enabled: event.target.checked })}
          />
          Enabled
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <label className="profile-trust-card__hint">
          Command
          <select
            value={target.command}
            onChange={(event) => onUpdate(target.id, { command: event.target.value as AppCommand })}
            style={{ width: '100%' }}
          >
            {COMMANDS.map((command) => (
              <option key={command} value={command}>
                {COMBO_ACTION_LABELS[command]}
              </option>
            ))}
          </select>
        </label>

        <label className="profile-trust-card__hint">
          Trigger
          <select
            value={typeof target.trigger === 'string' ? target.trigger : 'gazeAndBlink'}
            onChange={(event) => onUpdate(target.id, { trigger: event.target.value as SimpleGestureTrigger })}
            style={{ width: '100%' }}
          >
            {SIMPLE_TRIGGERS.map((trigger) => (
              <option key={trigger} value={trigger}>
                {TRIGGER_LABELS[trigger]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="profile-trust-card__hint">
        Horizontal ({Math.round(target.position.x * 100)}%)
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(target.position.x * 100)}
          onChange={(event) =>
            onUpdate(target.id, {
              position: { ...target.position, x: clamp01(Number(event.target.value) / 100) },
            })
          }
          style={{ width: '100%' }}
        />
      </label>

      <label className="profile-trust-card__hint">
        Vertical ({Math.round(target.position.y * 100)}%)
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(target.position.y * 100)}
          onChange={(event) =>
            onUpdate(target.id, {
              position: { ...target.position, y: clamp01(Number(event.target.value) / 100) },
            })
          }
          style={{ width: '100%' }}
        />
      </label>

      <label className="profile-trust-card__hint">
        Size ({target.size}%)
        <input
          type="range"
          min={6}
          max={18}
          value={target.size}
          onChange={(event) => onUpdate(target.id, { size: Number(event.target.value) })}
          style={{ width: '100%' }}
        />
      </label>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={() => onRemove(target.id)}>
          Remove
        </Button>
      </div>
    </div>
  )
}

export function VisionTargetEditor({ className }: Props) {
  const { targets, addTarget, updateTarget, removeTarget } = useScreenTargets()
  const [expanded, setExpanded] = useState(false)

  const sortedTargets = useMemo(
    () => [...targets].sort((a, b) => a.createdAt - b.createdAt),
    [targets],
  )

  return (
    <section className={className ?? 'profile-section'}>
      <h2 className="profile-section__title">Target editor</h2>
      <p className="profile-trust-card__hint" style={{ marginBottom: 10 }}>
        Fine-tune target bindings and position without leaving Profile.
      </p>
      <p className="profile-trust-card__hint mono" style={{ marginBottom: 10, fontSize: 11 }}>
        Targets: {targets.length}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: expanded ? 12 : 0 }}>
        <Button variant="secondary" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide editor' : 'Edit targets'}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            addTarget({
              label: `Target ${targets.length + 1}`,
              command: 'like',
              trigger: 'gazeAndBlink',
              position: { x: 0.5, y: 0.5 },
              size: 10,
              enabled: true,
            })
          }
        >
          Add target
        </Button>
      </div>

      {expanded ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {sortedTargets.map((target) => (
            <TargetEditorRow key={target.id} target={target} onUpdate={updateTarget} onRemove={removeTarget} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
