import type {
  PopsReplayProtectionResult,
  PopsReplaySignalBatch,
} from "./pops-security.types";

function patternKey(batch: PopsReplaySignalBatch): string {
  return `${batch.timingSignature}:${batch.signalDigest}`;
}

export class PopsReplayProtection {
  private readonly seenBatchIds = new Set<string>();
  private readonly sessionToPatternKeys = new Map<string, Set<string>>();
  private readonly accountToPatternKeys = new Map<string, Set<string>>();
  private readonly timingPatternAccounts = new Map<string, Set<string>>();
  private readonly seenSessions = new Set<string>();

  acceptBatch(batch: PopsReplaySignalBatch): PopsReplayProtectionResult {
    const reasons: string[] = [];

    if (this.seenBatchIds.has(batch.batchId)) {
      reasons.push("DUPLICATE_BATCH_ID");
    }

    const key = patternKey(batch);
    const sessionPatterns = this.sessionToPatternKeys.get(batch.sessionId) ?? new Set<string>();
    if (sessionPatterns.has(key)) {
      reasons.push("REPEATED_IDENTICAL_SIGNAL_BATCH");
    }

    const accountPatterns = this.accountToPatternKeys.get(batch.userId) ?? new Set<string>();
    if (accountPatterns.has(key)) {
      reasons.push("COPIED_EVENT_PATTERN_SAME_ACCOUNT");
    }

    const timingAccounts = this.timingPatternAccounts.get(batch.timingSignature) ?? new Set<string>();
    if (timingAccounts.size > 0 && !timingAccounts.has(batch.userId)) {
      reasons.push("SAME_EVENT_TIMING_ACROSS_ACCOUNTS");
    }

    if (this.seenSessions.has(batch.sessionId) && reasons.length === 0 && sessionPatterns.size === 0) {
      reasons.push("SESSION_REPLAYED");
    }

    if (reasons.length > 0) {
      return { accepted: false, reasons };
    }

    this.seenBatchIds.add(batch.batchId);
    sessionPatterns.add(key);
    this.sessionToPatternKeys.set(batch.sessionId, sessionPatterns);
    accountPatterns.add(key);
    this.accountToPatternKeys.set(batch.userId, accountPatterns);
    timingAccounts.add(batch.userId);
    this.timingPatternAccounts.set(batch.timingSignature, timingAccounts);
    this.seenSessions.add(batch.sessionId);

    return { accepted: true, reasons: [] };
  }
}
