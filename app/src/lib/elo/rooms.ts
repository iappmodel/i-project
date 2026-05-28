import type { PresenceRoom, PresenceRoomId } from './types'

export const PRESENCE_ROOMS: PresenceRoom[] = [
  {
    id: 'philosophy',
    label: 'Philosophy',
    description: 'Reflective cadence, cool lines',
    lineColor: 'rgba(180, 210, 255, 0.55)',
    pulseSpeed: 0.4,
    opacityScale: 0.9,
    microExpressionScale: 0.7,
    cadence: 'reflective',
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Minimal motion, reduced expressions',
    lineColor: 'rgba(200, 220, 240, 0.45)',
    pulseSpeed: 0.2,
    opacityScale: 0.75,
    microExpressionScale: 0.3,
    cadence: 'minimal',
  },
  {
    id: 'creator',
    label: 'Creator',
    description: 'Warm glow, amplified reactions',
    lineColor: 'rgba(255, 200, 160, 0.6)',
    pulseSpeed: 0.7,
    opacityScale: 1.1,
    microExpressionScale: 1.3,
    cadence: 'amplified',
  },
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Very low opacity, near-static',
    lineColor: 'rgba(160, 180, 220, 0.3)',
    pulseSpeed: 0.15,
    opacityScale: 0.4,
    microExpressionScale: 0.1,
    cadence: 'static',
  },
  {
    id: 'grief',
    label: 'Grief',
    description: 'Soft desaturated, gentle nods',
    lineColor: 'rgba(180, 190, 210, 0.35)',
    pulseSpeed: 0.25,
    opacityScale: 0.55,
    microExpressionScale: 0.4,
    cadence: 'gentle',
  },
  {
    id: 'writing',
    label: 'Writing',
    description: 'Attentive forward lean',
    lineColor: 'rgba(210, 220, 255, 0.5)',
    pulseSpeed: 0.45,
    opacityScale: 0.85,
    microExpressionScale: 0.6,
    cadence: 'attentive',
  },
  {
    id: 'study',
    label: 'Study',
    description: 'Focused, steady presence',
    lineColor: 'rgba(190, 215, 255, 0.48)',
    pulseSpeed: 0.35,
    opacityScale: 0.8,
    microExpressionScale: 0.5,
    cadence: 'attentive',
  },
]

export function getPresenceRoom(id: PresenceRoomId): PresenceRoom {
  return PRESENCE_ROOMS.find((r) => r.id === id) ?? PRESENCE_ROOMS[0]
}
