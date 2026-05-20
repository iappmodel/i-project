import { PopsRetentionPolicyService } from "./pops-retention-policy.service";
import {
  RETENTION_REASON,
  type PopsDeletionBatchResult,
  type PopsRetentionDataStore,
  type PopsUserDataExport
} from "./pops-retention.types";

export interface PopsDeletionServiceOptions {
  readonly store: PopsRetentionDataStore;
  readonly policy?: PopsRetentionPolicyService;
  readonly now?: () => Date;
}

/**
 * Orchestrates deletion, anonymization, legal holds, and GDPR-style export/delete flows.
 * Financial ledger rows are never hard-deleted here when legally required — the store
 * enforces skips and returns `skippedFinancialLedger`.
 */
export class PopsDeletionService {
  private readonly store: PopsRetentionDataStore;
  private readonly policy: PopsRetentionPolicyService;
  private readonly now: () => Date;

  constructor(options: PopsDeletionServiceOptions) {
    this.store = options.store;
    this.policy = options.policy ?? new PopsRetentionPolicyService();
    this.now = options.now ?? (() => new Date());
  }

  async deleteSessionRawData(sessionId: string): Promise<PopsDeletionBatchResult> {
    if (await this.store.sessionHasLegalHold(sessionId)) {
      return { affectedIds: [], skippedDueToHold: [sessionId], skippedFinancialLedger: [] };
    }
    return this.store.deleteSessionRawPayloads(sessionId);
  }

  async deleteExpiredSignalBatches(
    reasons?: ReadonlySet<(typeof RETENTION_REASON)[keyof typeof RETENTION_REASON]>
  ): Promise<PopsDeletionBatchResult> {
    const r = reasons ?? new Set();
    if (this.policy.fraudOrLegalHoldBlocksDeletion(r)) {
      return { affectedIds: [], skippedDueToHold: ["*"], skippedFinancialLedger: [] };
    }
    const cutoff = this.policy.signalBatchRawDeletionCutoff(this.now(), r);
    const cutoffIso = cutoff.toISOString();
    await this.store.markSignalBatchesAggregatedBefore(cutoffIso);
    return this.store.clearSignalBatchRawPayloadsOlderThan(cutoffIso);
  }

  async anonymizeOldEvents(
    reasons?: ReadonlySet<(typeof RETENTION_REASON)[keyof typeof RETENTION_REASON]>
  ): Promise<PopsDeletionBatchResult> {
    const r = reasons ?? new Set();
    if (this.policy.fraudOrLegalHoldBlocksDeletion(r)) {
      return { affectedIds: [], skippedDueToHold: ["*"], skippedFinancialLedger: [] };
    }
    const cutoff = this.policy.eventSoftRetentionCutoff(this.now(), r);
    return this.store.anonymizeEventsOlderThan(cutoff.toISOString());
  }

  async deleteRawSensitiveData(): Promise<PopsDeletionBatchResult> {
    return this.store.deleteOrAnonymizeRawSensitivePastPolicy(this.now().toISOString());
  }

  async applyLegalHold(sessionId: string, reason: string): Promise<void> {
    await this.store.applyLegalHold(sessionId, reason, this.now().toISOString());
  }

  async releaseLegalHold(sessionId: string): Promise<void> {
    await this.store.releaseLegalHold(sessionId, this.now().toISOString());
  }

  async exportUserPopsData(userId: string): Promise<PopsUserDataExport> {
    const slices = await this.store.loadUserExportSlices(userId);
    return {
      userId,
      exportedAt: this.now().toISOString(),
      sessions: slices.sessions,
      judgments: slices.judgments,
      rewardDecisions: slices.rewardDecisions,
      walletRewardIntents: slices.walletRewardIntents,
      privacyReceipts: slices.privacyReceipts,
      disputes: slices.disputes,
      userVisibleReasonSummaries: slices.userVisibleReasonSummaries,
      exclusionsNote: this.policy.exportExclusionsNote()
    };
  }

  /**
   * Removes ephemeral / non-ledger P.O.P.S data for a user. Ledger-linked receipts
   * stay tied to financial decisions unless the store determines legal deletion is allowed.
   */
  async deleteUserPopsData(userId: string): Promise<PopsDeletionBatchResult> {
    return this.store.deleteUserOwnedEphemeralPopsData(userId);
  }
}
