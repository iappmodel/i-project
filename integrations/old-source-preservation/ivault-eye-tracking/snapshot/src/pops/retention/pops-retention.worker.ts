import { PopsDeletionService } from "./pops-deletion.service";
import type { PopsRetentionWorkerRunSummary } from "./pops-retention.types";

export interface PopsRetentionWorkerOptions {
  readonly deletion: PopsDeletionService;
  readonly now?: () => Date;
}

/**
 * Periodic worker entrypoint: raw sensitive first, then batch TTL cleanup, then event anonymization.
 */
export class PopsRetentionWorker {
  private readonly deletion: PopsDeletionService;
  private readonly now: () => Date;

  constructor(options: PopsRetentionWorkerOptions) {
    this.deletion = options.deletion;
    this.now = options.now ?? (() => new Date());
  }

  async runRetentionSweep(): Promise<PopsRetentionWorkerRunSummary> {
    const startedAt = this.now().toISOString();
    const errors: string[] = [];

    let rawSensitive: Awaited<ReturnType<PopsDeletionService["deleteRawSensitiveData"]>> = {
      affectedIds: [],
      skippedDueToHold: [],
      skippedFinancialLedger: []
    };
    let signalBatches: Awaited<ReturnType<PopsDeletionService["deleteExpiredSignalBatches"]>> = {
      affectedIds: [],
      skippedDueToHold: [],
      skippedFinancialLedger: []
    };
    let eventsAnonymized: Awaited<ReturnType<PopsDeletionService["anonymizeOldEvents"]>> = {
      affectedIds: [],
      skippedDueToHold: [],
      skippedFinancialLedger: []
    };

    try {
      rawSensitive = await this.deletion.deleteRawSensitiveData();
    } catch (e) {
      errors.push(`deleteRawSensitiveData: ${String(e)}`);
    }

    try {
      signalBatches = await this.deletion.deleteExpiredSignalBatches();
    } catch (e) {
      errors.push(`deleteExpiredSignalBatches: ${String(e)}`);
    }

    try {
      eventsAnonymized = await this.deletion.anonymizeOldEvents();
    } catch (e) {
      errors.push(`anonymizeOldEvents: ${String(e)}`);
    }

    const finishedAt = this.now().toISOString();

    return {
      startedAt,
      finishedAt,
      signalBatches,
      eventsAnonymized,
      rawSensitive,
      errors
    };
  }
}
