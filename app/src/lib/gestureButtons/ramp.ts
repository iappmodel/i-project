import type { ButtonRampConfig } from './types'

const STEP_CURVES: Record<ButtonRampConfig['preset'], number[]> = {
  gentle: [0, 1, 2, 3, 5, 8, 13, 21, 34],
  standard: [0, 1, 2, 3, 5, 8, 13, 21, 34, 49, 73, 99],
  aggressive: [0, 2, 5, 8, 13, 21, 34, 49, 73, 99, 150, 200],
}

export function rampStepIndex(elapsedOfferingMs: number, tickMs = 140): number {
  return Math.floor(elapsedOfferingMs / tickMs)
}

export function rampAmount(
  stepIndex: number,
  ramp: ButtonRampConfig,
  deepHold: boolean,
): number {
  const curve = STEP_CURVES[ramp.preset]
  const idx = Math.min(Math.max(0, stepIndex), curve.length - 1)
  let value = curve[idx] ?? ramp.minAmount
  if (deepHold) {
    value = Math.round(value * 1.35)
  }
  return Math.min(ramp.maxAmount, Math.max(ramp.minAmount, value))
}
