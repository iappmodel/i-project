import { beforeEach, describe, expect, it } from "vitest";
import {
  getSafetyReport,
  getSafetyVerificationResult,
  markSafetyReportUnderReview,
  resetSafetyReportStoreForTests,
  submitSafetyReport,
  verifyStoredSafetyReport
} from "../safety-report-store";

describe("safety-report-store", () => {
  beforeEach(() => {
    resetSafetyReportStoreForTests();
  });

  it("submits safety report", () => {
    const report = submitSafetyReport({
      reporterUserId: crypto.randomUUID(),
      reportedUserId: crypto.randomUUID(),
      context: "scam",
      objectType: "message",
      objectId: crypto.randomUUID(),
      reporterAgeBand: "18_plus"
    });

    expect(report.status).toBe("submitted");

    const stored = getSafetyReport(report.safetyReportId);
    expect(stored?.safetyReportId).toBe(report.safetyReportId);
  });

  it("marks report under review", () => {
    const report = submitSafetyReport({
      reporterUserId: crypto.randomUUID(),
      reportedUserId: crypto.randomUUID(),
      context: "scam",
      objectType: "message",
      objectId: crypto.randomUUID(),
      reporterAgeBand: "18_plus"
    });

    const updated = markSafetyReportUnderReview(report.safetyReportId);

    expect(updated.status).toBe("under_review");
    expect(updated.reviewedAt).toBeTruthy();
  });

  it("verifies stored report", () => {
    const report = submitSafetyReport({
      reporterUserId: crypto.randomUUID(),
      reportedUserId: crypto.randomUUID(),
      context: "scam",
      objectType: "message",
      objectId: crypto.randomUUID(),
      reporterAgeBand: "18_plus"
    });

    const result = verifyStoredSafetyReport({
      safetyReportId: report.safetyReportId,

      evidenceScore: 0.85,
      reportClarityScore: 0.8,
      reporterHistoryScore: 0.75,

      harmSeverity: 0.8,
      urgencyScore: 0.7,

      moderationOutcome: "account_restricted",

      reportValid: true,
      appealReversed: false,

      falseReportRisk: 0.03,
      brigadingRisk: 0.03,
      retaliationRisk: 0.03,
      manipulationRisk: 0.03,
      reporterDeviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("safety_contribution_verified");

    const stored = getSafetyVerificationResult(report.safetyReportId);
    expect(stored?.status).toBe("safety_contribution_verified");

    const updatedReport = getSafetyReport(report.safetyReportId);
    expect(updatedReport?.status).toBe("validated");
  });
});
