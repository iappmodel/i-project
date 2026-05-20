import type { Json } from "@/types/alphabet/database.types";
import type { ScheduledJobHandlerResult, ScheduledJobKey } from "@/types/alphabet/scheduled-job.types";
import { runProviderPollingOnce } from "../provider-reconciliation/provider-polling-worker";
import {
  runOperationalAlertScannerOnce,
  scanPendingExternalTransfers,
  scanReviewSlaBreaches
} from "../operational-alerts/operational-alert-scanner";
import { runStuckSagaScan } from "../stuck-saga/stuck-saga-scanner";
import { runWalletInvariantScan } from "../wallet-invariants/wallet-invariant-scanner";
import {
  runDedupeExpiryScan,
  runIdempotencyExpiryScan
} from "../idempotency-expiry/idempotency-expiry-scanner";
import { runTrustFraudReviewBatch } from "../trust-fraud-review/trust-fraud-review-scanner";

async function okResult(params: {
  resultPayload?: Json;
  scannedObjectCounts?: Record<string, number>;
  mutationCounts?: Record<string, number>;
  reasonCodes?: string[];
}): Promise<ScheduledJobHandlerResult> {
  return {
    ok: true,
    resultPayload: (params.resultPayload ?? {}) as Json,
    scannedObjectCounts: params.scannedObjectCounts ?? {},
    mutationCounts: params.mutationCounts ?? {},
    sourceEventIds: [],
    createdAlertIds: [],
    createdReviewCaseIds: [],
    reasonCodes: params.reasonCodes ?? ["scheduled_job_completed"],
    retryable: false
  };
}

export async function runScheduledJobHandler(jobKey: ScheduledJobKey): Promise<ScheduledJobHandlerResult> {
  switch (jobKey) {
    case "provider_polling_5m": {
      const result = await runProviderPollingOnce({
        limit: 25
      });

      return okResult({
        resultPayload: result as unknown as Json,
        scannedObjectCounts: {
          transfersChecked: result.checked,
          transfersReconciled: result.reconciled
        },
        reasonCodes: ["provider_polling_completed"]
      });
    }

    case "pending_payout_scan_5m": {
      const result = await scanPendingExternalTransfers({
        olderThanMinutes: 60,
        limit: 50
      });

      return okResult({
        resultPayload: result as unknown as Json,
        scannedObjectCounts: {
          transfersChecked: result.checked
        },
        mutationCounts: {
          alertsCreated: result.created
        },
        reasonCodes: ["pending_payout_scan_completed"]
      });
    }

    case "review_sla_scan_5m": {
      const result = await scanReviewSlaBreaches({
        limit: 50
      });

      return okResult({
        resultPayload: result as unknown as Json,
        scannedObjectCounts: {
          reviewsChecked: result.checked
        },
        mutationCounts: {
          alertsCreated: result.created
        },
        reasonCodes: ["review_sla_scan_completed"]
      });
    }

    case "operational_alert_scan_5m": {
      const result = await runOperationalAlertScannerOnce();

      return okResult({
        resultPayload: result as unknown as Json,
        scannedObjectCounts: {
          pendingTransfersChecked: result.pending.checked,
          slaReviewsChecked: result.sla.checked
        },
        mutationCounts: {
          alertsCreated: result.totalCreated
        },
        reasonCodes: ["operational_alert_scan_completed"]
      });
    }

    case "stuck_saga_scan_1h": {
      const result = await runStuckSagaScan({
        olderThanMinutes: 15,
        limit: 100
      });

      return {
        ok: result.ok,
        resultPayload: result.resultPayload,
        errorPayload: result.ok
          ? null
          : {
              reasonCodes: result.reasonCodes
            },
        scannedObjectCounts: result.scannedObjectCounts,
        mutationCounts: result.mutationCounts,
        sourceEventIds: result.sourceEventIds,
        createdAlertIds: result.createdAlertIds,
        createdReviewCaseIds: result.createdReviewCaseIds,
        reasonCodes: result.reasonCodes,
        retryable: result.retryable
      };
    }

    case "wallet_invariant_scan_1h": {
      const result = await runWalletInvariantScan({
        limit: 100
      });

      return {
        ok: result.ok,
        resultPayload: result.resultPayload,
        errorPayload: result.ok ? null : (result.errorPayload ?? { reasonCodes: result.reasonCodes }),
        scannedObjectCounts: result.scannedObjectCounts,
        mutationCounts: result.mutationCounts,
        sourceEventIds: result.sourceEventIds,
        createdAlertIds: result.createdAlertIds,
        createdReviewCaseIds: result.createdReviewCaseIds,
        reasonCodes: result.reasonCodes,
        retryable: result.retryable
      };
    }

    case "idempotency_expiry_1h": {
      const result = await runIdempotencyExpiryScan({
        limit: 250
      });

      return {
        ok: result.ok,
        resultPayload: result.resultPayload,
        errorPayload: result.ok
          ? null
          : {
              reasonCodes: result.reasonCodes
            },
        scannedObjectCounts: result.scannedObjectCounts,
        mutationCounts: result.mutationCounts,
        sourceEventIds: result.sourceEventIds,
        createdAlertIds: result.createdAlertIds,
        createdReviewCaseIds: result.createdReviewCaseIds,
        reasonCodes: result.reasonCodes,
        retryable: result.retryable
      };
    }

    case "dedupe_expiry_1h": {
      const result = await runDedupeExpiryScan({
        limit: 250
      });

      return {
        ok: result.ok,
        resultPayload: result.resultPayload,
        errorPayload: result.ok
          ? null
          : {
              reasonCodes: result.reasonCodes
            },
        scannedObjectCounts: result.scannedObjectCounts,
        mutationCounts: result.mutationCounts,
        sourceEventIds: result.sourceEventIds,
        createdAlertIds: result.createdAlertIds,
        createdReviewCaseIds: result.createdReviewCaseIds,
        reasonCodes: result.reasonCodes,
        retryable: result.retryable
      };
    }

    case "audit_integrity_daily": {
      return okResult({
        resultPayload: {
          placeholder: true,
          message: "Audit integrity report boundary defined."
        },
        scannedObjectCounts: {
          auditRecordsChecked: 0
        },
        reasonCodes: ["audit_integrity_placeholder_completed"]
      });
    }

    case "financial_reconciliation_daily": {
      return okResult({
        resultPayload: {
          placeholder: true,
          message: "Financial reconciliation report boundary defined."
        },
        scannedObjectCounts: {
          ledgerEntriesChecked: 0,
          transfersChecked: 0
        },
        reasonCodes: ["financial_reconciliation_placeholder_completed"]
      });
    }

    case "trust_fraud_review_daily": {
      const result = await runTrustFraudReviewBatch({
        batchScope: "global_daily",
        generatedBy: "scheduled_job"
      });

      return {
        ok: result.ok,
        resultPayload: result.resultPayload,
        errorPayload: result.ok
          ? null
          : {
              reasonCodes: result.reasonCodes
            },
        scannedObjectCounts: result.scannedObjectCounts,
        mutationCounts: result.mutationCounts,
        sourceEventIds: result.sourceEventIds,
        createdAlertIds: result.createdAlertIds,
        createdReviewCaseIds: result.createdReviewCaseIds,
        reasonCodes: result.reasonCodes,
        retryable: result.retryable
      };
    }

    default:
      return {
        ok: false,
        resultPayload: {},
        errorPayload: {
          jobKey,
          error: "Unknown scheduled job key."
        },
        scannedObjectCounts: {},
        mutationCounts: {},
        sourceEventIds: [],
        createdAlertIds: [],
        createdReviewCaseIds: [],
        reasonCodes: ["scheduled_job_unknown_key"],
        retryable: false
      };
  }
}
