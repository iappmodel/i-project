import type { EloAction, EloDecision } from '../types';

const SENSITIVE_ACTIONS = new Set<EloAction['actionType']>([
  'withdraw',
  'convert',
  'pay',
  'external_post',
  'external_message',
  'identity_verification',
  'bank_linking',
  'tax_forms',
]);

export function isSensitiveAction(action: EloAction): boolean {
  return SENSITIVE_ACTIONS.has(action.actionType);
}

export function applySafety(action: EloAction, explicitConfirmation: boolean): EloDecision | null {
  if (!isSensitiveAction(action)) return null;
  if (explicitConfirmation) return null;

  return {
    id: `safety-${action.id}`,
    userId: 'user-1',
    decisionType: 'block',
    title: 'Action paused for safety',
    body: 'This action is sensitive and requires explicit confirmation before execution.',
    confidence: 1,
    urgency: 'high',
    sensitivity: action.sensitivity,
    reasonCodes: ['sensitive_action_requires_confirmation'],
    sourceSignals: { wallet: true, trust: true },
  };
}

