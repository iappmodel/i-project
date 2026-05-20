import type {
  TrustImpactEvent,
  TrustScoreState,
  TrustScoreUpdateResult
} from "../../types/alphabet/trust.types";
import { applyTrustImpactEvent, createDefaultTrustScoreState } from "./trust-score-engine";

type TrustFreezeFlags = {
  requiresManualReview: boolean;
  freezesWithdrawals: boolean;
  freezesConversions: boolean;
  freezesCreatorMonetization: boolean;
};

type TrustStoreState = {
  scores: Map<string, TrustScoreState>;
  auditHistory: Map<string, TrustScoreUpdateResult[]>;
  freezeFlags: Map<string, TrustFreezeFlags>;
};

const store: TrustStoreState = {
  scores: new Map(),
  auditHistory: new Map(),
  freezeFlags: new Map()
};

function mergeFlags(
  previous: TrustFreezeFlags | undefined,
  next: TrustFreezeFlags
): TrustFreezeFlags {
  return {
    requiresManualReview:
      Boolean(previous?.requiresManualReview) || next.requiresManualReview,
    freezesWithdrawals:
      Boolean(previous?.freezesWithdrawals) || next.freezesWithdrawals,
    freezesConversions:
      Boolean(previous?.freezesConversions) || next.freezesConversions,
    freezesCreatorMonetization:
      Boolean(previous?.freezesCreatorMonetization) || next.freezesCreatorMonetization
  };
}

export function getOrCreateTrustScore(userId: string): TrustScoreState {
  const existing = store.scores.get(userId);
  if (existing) return existing;

  const created = createDefaultTrustScoreState(userId);
  store.scores.set(userId, created);
  return created;
}

export function getTrustScore(userId: string): TrustScoreState | null {
  return store.scores.get(userId) ?? null;
}

export function getTrustAuditHistory(userId: string): TrustScoreUpdateResult[] {
  return store.auditHistory.get(userId) ?? [];
}

export function getTrustFreezeFlags(userId: string): TrustFreezeFlags {
  return (
    store.freezeFlags.get(userId) ?? {
      requiresManualReview: false,
      freezesWithdrawals: false,
      freezesConversions: false,
      freezesCreatorMonetization: false
    }
  );
}

export function applyTrustUpdateResult(
  result: TrustScoreUpdateResult
): TrustScoreUpdateResult {
  const userId = result.previousState.userId;

  const history = store.auditHistory.get(userId) ?? [];
  store.auditHistory.set(userId, [...history, result]);

  if (!result.updated) {
    return result;
  }

  store.scores.set(userId, result.nextState);

  const previousFlags = store.freezeFlags.get(userId);
  store.freezeFlags.set(userId, mergeFlags(previousFlags, result.flags));

  return result;
}

export function applyTrustImpactEventToUser(
  event: TrustImpactEvent
): TrustScoreUpdateResult {
  const previousState = getOrCreateTrustScore(event.userId);
  const result = applyTrustImpactEvent({
    previousState,
    event
  });

  return applyTrustUpdateResult(result);
}

export function resetTrustStoreForTests(): void {
  store.scores.clear();
  store.auditHistory.clear();
  store.freezeFlags.clear();
}
