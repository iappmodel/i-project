import type { EloVisualForm } from './types'

export interface VisualFormConfig {
  id: EloVisualForm
  label: string
  description: string
}

export const VISUAL_FORMS: VisualFormConfig[] = [
  {
    id: 'lineFace',
    label: 'Glass face',
    description: 'Sculptural contours — default presence membrane',
  },
  {
    id: 'lightForm',
    label: 'Light form',
    description: 'Soft glow — minimal lines, luminous halo',
  },
  {
    id: 'abstract',
    label: 'Abstract',
    description: 'Essential jaw line — open, minimal structure',
  },
  {
    id: 'symbol',
    label: 'Symbol',
    description: 'Orbital presence — circle and gaze points',
  },
]

export function getVisualForm(id: EloVisualForm): VisualFormConfig {
  return VISUAL_FORMS.find((f) => f.id === id) ?? VISUAL_FORMS[0]
}
