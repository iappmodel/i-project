import type { EloAction } from '../types'
import { applySafety } from './eloSafetyService'

export interface ActionResult {
  ok: boolean
  decision: { body: string }
}

export function executeEloAction(action: EloAction, explicitConfirmation = false): ActionResult {
  const block = applySafety(action, explicitConfirmation)
  if (block) {
    return { ok: false, decision: { body: block.body } }
  }
  return { ok: true, decision: { body: `Prepared ${action.actionType.replaceAll('_', ' ')}.` } }
}
