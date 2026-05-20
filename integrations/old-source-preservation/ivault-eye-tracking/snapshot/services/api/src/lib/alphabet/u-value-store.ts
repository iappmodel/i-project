import type {
  UValueImpactEvent,
  UValueState,
  UValueUpdateResult
} from "../../types/alphabet/u-value.types";
import {
  applyUValueImpactEvent,
  createDefaultUValueState
} from "./u-value-engine";

type UValueStoreState = {
  states: Map<string, UValueState>;
  auditHistory: Map<string, UValueUpdateResult[]>;
};

const store: UValueStoreState = {
  states: new Map(),
  auditHistory: new Map()
};

export function getOrCreateUValueState(userId: string): UValueState {
  const existing = store.states.get(userId);
  if (existing) return existing;

  const created = createDefaultUValueState(userId);
  store.states.set(userId, created);
  return created;
}

export function getUValueState(userId: string): UValueState | null {
  return store.states.get(userId) ?? null;
}

export function getUValueAuditHistory(userId: string): UValueUpdateResult[] {
  return store.auditHistory.get(userId) ?? [];
}

export function applyUValueUpdateResult(
  result: UValueUpdateResult
): UValueUpdateResult {
  const userId = result.previousState.userId;
  const history = store.auditHistory.get(userId) ?? [];
  store.auditHistory.set(userId, [...history, result]);

  if (result.updated) {
    store.states.set(userId, result.nextState);
  }

  return result;
}

export function applyUValueImpactEventToUser(
  event: UValueImpactEvent
): UValueUpdateResult {
  const previousState = getOrCreateUValueState(event.userId);
  const result = applyUValueImpactEvent({
    previousState,
    event
  });

  return applyUValueUpdateResult(result);
}

export function resetUValueStoreForTests(): void {
  store.states.clear();
  store.auditHistory.clear();
}
