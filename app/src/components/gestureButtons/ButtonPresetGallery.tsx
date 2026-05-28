import { BUILDER_PRESET_CARDS } from '../../lib/gestureButtons/presets'
import type { ButtonInstanceConfig } from '../../lib/gestureButtons/types'

type Props = {
  onSelect: (preset: ButtonInstanceConfig) => void
}

export function ButtonPresetGallery({ onSelect }: Props) {
  return (
    <div className="button-preset-gallery">
      {BUILDER_PRESET_CARDS.map(({ preset, description }) => (
        <button
          key={preset.presetId ?? preset.id}
          type="button"
          className="button-preset-card"
          onClick={() => onSelect(preset)}
        >
          <span className="button-preset-card__label">{preset.label}</span>
          <span className="button-preset-card__desc">{description}</span>
        </button>
      ))}
    </div>
  )
}
