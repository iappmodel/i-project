import type { ButtonInstanceConfig } from './types'

export const LIKE_LOVE_PRESET_ID = 'like-love'

export const LIKE_LOVE_PRESET: ButtonInstanceConfig = {
  id: 'like-love',
  presetId: LIKE_LOVE_PRESET_ID,
  label: 'Like / Love',
  enabled: true,
  chrome: { icon: 'heart', glassOpacity: 0.45, size: 'md' },
  thresholds: {
    armMs: 500,
    deepHoldMs: 3000,
    directionThresholdPx: 24,
    doubleTapMs: 320,
    tripleTapMs: 480,
  },
  ramp: { preset: 'standard', minAmount: 0, maxAmount: 99 },
  bindings: [
    { trigger: 'tap', action: { type: 'like' } },
    { trigger: 'double_tap', action: { type: 'save' } },
    { trigger: 'triple_tap', action: { type: 'custom', id: 'boost' } },
    { trigger: 'swipe_up', action: { type: 'tip', coin: 'vicoin' } },
    { trigger: 'swipe_down', action: { type: 'tip', coin: 'icoin' } },
    { trigger: 'swipe_left', action: { type: 'noop' } },
    { trigger: 'swipe_right', action: { type: 'noop' } },
  ],
}

export const COMMENT_PRESET: ButtonInstanceConfig = {
  id: 'comment',
  presetId: 'comment',
  label: 'Comment',
  enabled: true,
  chrome: { icon: 'comment', glassOpacity: 0.45, size: 'md' },
  thresholds: {
    armMs: 500,
    deepHoldMs: 3000,
    directionThresholdPx: 24,
    doubleTapMs: 320,
    tripleTapMs: 480,
  },
  ramp: { preset: 'gentle', minAmount: 0, maxAmount: 50 },
  bindings: [
    { trigger: 'tap', action: { type: 'custom', id: 'open_comments' } },
    { trigger: 'swipe_up', action: { type: 'noop' } },
    { trigger: 'swipe_down', action: { type: 'noop' } },
    { trigger: 'swipe_left', action: { type: 'noop' } },
    { trigger: 'swipe_right', action: { type: 'noop' } },
  ],
}

export const SHARE_PRESET: ButtonInstanceConfig = {
  id: 'share',
  presetId: 'share',
  label: 'Share',
  enabled: true,
  chrome: { icon: 'share', glassOpacity: 0.45, size: 'md' },
  thresholds: {
    armMs: 500,
    deepHoldMs: 3000,
    directionThresholdPx: 24,
    doubleTapMs: 320,
    tripleTapMs: 480,
  },
  ramp: { preset: 'gentle', minAmount: 0, maxAmount: 50 },
  bindings: [
    { trigger: 'tap', action: { type: 'share' } },
    { trigger: 'double_tap', action: { type: 'noop' } },
    { trigger: 'swipe_up', action: { type: 'noop' } },
    { trigger: 'swipe_down', action: { type: 'noop' } },
    { trigger: 'swipe_left', action: { type: 'noop' } },
    { trigger: 'swipe_right', action: { type: 'noop' } },
  ],
}

/** Wireframe CONTROLS — crosshair / button settings entry */
export const CONTROLS_PRESET: ButtonInstanceConfig = {
  id: 'controls',
  presetId: 'controls',
  label: 'Controls',
  enabled: true,
  chrome: { icon: 'more', glassOpacity: 0.45, size: 'md' },
  thresholds: {
    armMs: 500,
    deepHoldMs: 3000,
    directionThresholdPx: 24,
    doubleTapMs: 320,
    tripleTapMs: 480,
    builderHoldMs: 1000,
  },
  ramp: { preset: 'gentle', minAmount: 0, maxAmount: 50 },
  bindings: [
    { trigger: 'tap', action: { type: 'custom', id: 'open_controls' } },
    { trigger: 'swipe_up', action: { type: 'noop' } },
    { trigger: 'swipe_down', action: { type: 'noop' } },
    { trigger: 'swipe_left', action: { type: 'noop' } },
    { trigger: 'swipe_right', action: { type: 'noop' } },
  ],
}

export const BUTTON_PRESETS: ButtonInstanceConfig[] = [
  LIKE_LOVE_PRESET,
  COMMENT_PRESET,
  SHARE_PRESET,
  CONTROLS_PRESET,
]

/** Top → bottom on right rail (wireframe order) */
export const DEFAULT_RAIL_BUTTON_IDS = ['like-love', 'comment', 'share', 'controls'] as const

export const BLANK_PRESET: ButtonInstanceConfig = {
  id: 'blank',
  presetId: 'blank',
  label: 'Blank',
  enabled: true,
  chrome: { icon: 'plus', glassOpacity: 0.4, size: 'md' },
  thresholds: {
    armMs: 500,
    deepHoldMs: 3000,
    directionThresholdPx: 24,
    doubleTapMs: 320,
    tripleTapMs: 480,
  },
  ramp: { preset: 'gentle', minAmount: 0, maxAmount: 50 },
  bindings: [
    { trigger: 'tap', action: { type: 'noop' } },
    { trigger: 'swipe_up', action: { type: 'noop' } },
    { trigger: 'swipe_down', action: { type: 'noop' } },
    { trigger: 'swipe_left', action: { type: 'noop' } },
    { trigger: 'swipe_right', action: { type: 'noop' } },
  ],
}

export const BUILDER_PRESET_CARDS = [
  { preset: LIKE_LOVE_PRESET, description: 'Tap like · hold to tip' },
  { preset: COMMENT_PRESET, description: 'Open comments' },
  { preset: SHARE_PRESET, description: 'Share media' },
  { preset: CONTROLS_PRESET, description: 'Button builder entry' },
  { preset: BLANK_PRESET, description: 'Empty slot' },
] as const
