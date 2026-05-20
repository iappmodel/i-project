import type {
  ModerationOutcome,
  SafetyReport,
  SafetyReportContext,
  SafetySignalInput,
  SafetyVerificationResult
} from "../../types/alphabet/safety.types";
import { verifySafetyReport } from "./safety-engine";

type SafetyReportStoreState = {
  reports: Map<string, SafetyReport>;
  verificationResults: Map<string, SafetyVerificationResult>;
};

const store: SafetyReportStoreState = {
  reports: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function submitSafetyReport(params: {
  reporterUserId: string;
  reportedUserId?: string | null;
  context: SafetyReportContext;
  objectType: string;
  objectId: string;
  reporterAgeBand: string;
}): SafetyReport {
  const now = nowIso();

  const report: SafetyReport = {
    safetyReportId: createId("safety_report"),
    reporterUserId: params.reporterUserId,
    reportedUserId: params.reportedUserId ?? null,
    context: params.context,
    objectType: params.objectType,
    objectId: params.objectId,
    status: "submitted",
    reporterAgeBand: params.reporterAgeBand,
    submittedAt: now,
    reviewedAt: null,
    closedAt: null,
    updatedAt: now
  };

  store.reports.set(report.safetyReportId, report);

  return report;
}

export function getSafetyReport(safetyReportId: string): SafetyReport | null {
  return store.reports.get(safetyReportId) ?? null;
}

export function markSafetyReportUnderReview(safetyReportId: string): SafetyReport {
  const report = getSafetyReport(safetyReportId);

  if (!report) {
    throw new Error("Safety report not found.");
  }

  const now = nowIso();
  const next: SafetyReport = {
    ...report,
    status: "under_review",
    reviewedAt: now,
    updatedAt: now
  };

  store.reports.set(next.safetyReportId, next);

  return next;
}

export function verifyStoredSafetyReport(
  input: Omit<
    SafetySignalInput,
    | "safetyReportId"
    | "reporterUserId"
    | "reportedUserId"
    | "context"
    | "objectType"
    | "objectId"
    | "reporterAgeBand"
  > & {
    safetyReportId: string;
  }
): SafetyVerificationResult {
  const report = getSafetyReport(input.safetyReportId);

  if (!report) {
    throw new Error("Safety report not found.");
  }

  const result = verifySafetyReport({
    ...input,
    safetyReportId: report.safetyReportId,
    reporterUserId: report.reporterUserId,
    reportedUserId: report.reportedUserId,
    context: report.context,
    objectType: report.objectType,
    objectId: report.objectId,
    reporterAgeBand: report.reporterAgeBand,
    metadata: {
      ...input.metadata
    }
  });

  const nextStatus: SafetyReport["status"] =
    result.status === "safety_contribution_verified" ||
    result.status === "judgment_verified" ||
    result.status === "valid_report"
      ? "validated"
      : result.status === "invalid_report"
        ? "invalid"
        : result.status === "false_report"
          ? "false_report"
          : result.status === "needs_review"
            ? "needs_review"
            : "suspicious";

  const now = nowIso();
  const next: SafetyReport = {
    ...report,
    status: nextStatus,
    reviewedAt: report.reviewedAt ?? now,
    closedAt:
      nextStatus === "validated" ||
      nextStatus === "invalid" ||
      nextStatus === "false_report"
        ? now
        : report.closedAt,
    updatedAt: now
  };

  store.reports.set(next.safetyReportId, next);
  store.verificationResults.set(result.safetyReportId, result);

  return result;
}

export function closeSafetyReport(params: {
  safetyReportId: string;
  moderationOutcome: ModerationOutcome;
}): SafetyReport {
  const report = getSafetyReport(params.safetyReportId);

  if (!report) {
    throw new Error("Safety report not found.");
  }

  const _moderationOutcome = params.moderationOutcome;
  void _moderationOutcome;

  const now = nowIso();
  const next: SafetyReport = {
    ...report,
    status: "closed",
    closedAt: now,
    updatedAt: now
  };

  store.reports.set(next.safetyReportId, next);

  return next;
}

export function getSafetyVerificationResult(
  safetyReportId: string
): SafetyVerificationResult | null {
  return store.verificationResults.get(safetyReportId) ?? null;
}

export function resetSafetyReportStoreForTests(): void {
  store.reports.clear();
  store.verificationResults.clear();
}
