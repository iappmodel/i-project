import { DataClass, PrivacyPurpose, RetentionPolicy } from "./types";
import { PrivacyEventContract, PrivacyEventType } from "./events";
import { randomUUID } from "node:crypto";

export interface RetentionCandidate {
  recordId: string;
  tableName: string;
  userId: string | null;
  retentionPolicy: RetentionPolicy;
  expiresAt: string;
  legalHold: boolean;
}

export interface RetentionRepository {
  findExpired(nowIso: string): Promise<RetentionCandidate[]>;
  deleteRecord(tableName: string, recordId: string): Promise<void>;
  anonymizeRecord(tableName: string, recordId: string): Promise<void>;
  confirmRawSignalDeletion(recordId: string, confirmedAt: string): Promise<void>;
  appendAudit(event: PrivacyEventContract): Promise<void>;
}

const DELETE_POLICIES = new Set<RetentionPolicy>([
  RetentionPolicy.ImmediateDelete,
  RetentionPolicy.SessionBounded,
  RetentionPolicy.UserControlled,
]);

export async function runRetentionEnforcementJob(
  repository: RetentionRepository,
  now = new Date(),
): Promise<void> {
  const nowIso = now.toISOString();
  const candidates = await repository.findExpired(nowIso);

  for (const candidate of candidates) {
    if (candidate.legalHold && candidate.tableName === "wallet_ledger_entries") {
      continue;
    }

    if (DELETE_POLICIES.has(candidate.retentionPolicy)) {
      await repository.deleteRecord(candidate.tableName, candidate.recordId);
    } else {
      await repository.anonymizeRecord(candidate.tableName, candidate.recordId);
    }

    if (candidate.tableName === "raw_signal_processing_sessions") {
      await repository.confirmRawSignalDeletion(candidate.recordId, nowIso);
    }

    await repository.appendAudit({
      event_id: randomUUID(),
      user_id: candidate.userId ?? "00000000-0000-0000-0000-000000000000",
      event_type: PrivacyEventType.RetentionPolicyApplied,
      data_class: DataClass.EconomicLegalProof,
      purpose: PrivacyPurpose.RetentionEnforcement,
      created_at: nowIso,
      retention_policy: candidate.retentionPolicy,
      raw_data_included: false,
      actor: "retention_enforcement_job",
      metadata: {
        table_name: candidate.tableName,
        record_id: candidate.recordId,
        action: DELETE_POLICIES.has(candidate.retentionPolicy) ? "deleted" : "anonymized",
      },
    });
  }
}
