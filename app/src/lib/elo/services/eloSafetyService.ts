import type { EloAction } from '../types'

const SENSITIVE_ACTIONS = new Set<EloAction['actionType']>([
  'withdraw',
  'convert',
  'pay',
  'external_post',
  'external_message',
  'identity_verification',
  'bank_linking',
  'tax_forms',
])

export function isSensitiveAction(action: EloAction): boolean {
  return SENSITIVE_ACTIONS.has(action.actionType)
}

export interface SafetyDecision {
  title: string
  body: string
}

export function applySafety(action: EloAction, explicitConfirmation: boolean): SafetyDecision | null {
  if (!isSensitiveAction(action)) return null
  if (explicitConfirmation) return null
  return {
    title: 'Action paused for safety',
    body: 'This action is sensitive and requires explicit confirmation before execution.',
  }
}
