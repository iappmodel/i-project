import { applySafety } from './eloSafetyService';
import type { EloAction, EloDecision } from '../types';

export interface EloActionResult {
  status: 'executed' | 'blocked';
  decision: EloDecision;
}

export function executeEloAction(action: EloAction, explicitConfirmation = false): EloActionResult {
  const safetyBlock = applySafety(action, explicitConfirmation);
  if (safetyBlock) {
    return { status: 'blocked', decision: safetyBlock };
  }

  return {
    status: 'executed',
    decision: {
      id: `action-${action.id}`,
      userId: 'user-1',
      decisionType: 'explanation',
      title: 'Action prepared',
      body: `ELO prepared: ${action.actionType.replaceAll('_', ' ')}.`,
      confidence: 0.95,
      urgency: 'low',
      sensitivity: action.sensitivity,
      reasonCodes: ['safe_action_allowed'],
      sourceSignals: { wallet: true, trust: true },
      targetAction: action,
    },
  };
}

