import { describe, expect, it } from "vitest";
import type { SafetySignalInput } from "../../../types/alphabet/safety.types";
import { verifySafetyReport } from "../safety-engine";

function makeInput(overrides: Partial<SafetySignalInput> = {}): SafetySignalInput {
  return {
    safetyReportId: crypto.randomUUID(),

    reporterUserId: crypto.randomUUID(),
    reportedUserId: crypto.randomUUID(),

    context: "scam",

    objectType: "message",
    objectId: crypto.randomUUID(),

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
    reporterDeviceIntegrityScore: 0.9,

    reporterAgeBand: "18_plus",

    metadata: {},
    ...overrides
  };
}

describe("safety-engine", () => {
  it("verifies strong safety contribution", () => {
    const result = verifySafetyReport(makeInput());

    expect(result.status).toBe("safety_contribution_verified");
    expect(result.safetyContributionScore).toBeGreaterThan(0.65);
    expect(result.judgmentScore).toBeGreaterThan(0.6);
    expect(result.safetyContributionEvent?.eventType).toBe(
      "safety_contribution_verified"
    );
    expect(result.judgmentEvent?.eventType).toBe("judgment_verified");
  });

  it("verifies judgment when valid report is useful but not severe enough", () => {
    const result = verifySafetyReport(
      makeInput({
        context: "spam",
        harmSeverity: 0.2,
        moderationOutcome: "content_removed"
      })
    );

    expect(["judgment_verified", "valid_report"]).toContain(result.status);
  });

  it("marks invalid report", () => {
    const result = verifySafetyReport(
      makeInput({
        reportValid: false,
        falseReportRisk: 0.2,
        moderationOutcome: "no_violation"
      })
    );

    expect(result.status).toBe("invalid_report");
    expect(result.reasons).toContain("report_invalid");
  });

  it("detects false report", () => {
    const result = verifySafetyReport(
      makeInput({
        reportValid: false,
        falseReportRisk: 0.95,
        moderationOutcome: "no_violation"
      })
    );

    expect(result.status).toBe("false_report");
    expect(result.falseReportEvent?.eventType).toBe("false_report_detected");
  });

  it("flags brigading as suspicious", () => {
    const result = verifySafetyReport(
      makeInput({
        brigadingRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("brigading_risk_above_maximum");
  });

  it("flags retaliation as suspicious", () => {
    const result = verifySafetyReport(
      makeInput({
        retaliationRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("retaliation_risk_above_maximum");
  });

  it("needs review for strict child safety pending report", () => {
    const result = verifySafetyReport(
      makeInput({
        context: "child_safety",
        moderationOutcome: "pending"
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("strict_review_required");
  });

  it("blocks under 13 misinformation reporting into review", () => {
    const result = verifySafetyReport(
      makeInput({
        context: "misinformation",
        reporterAgeBand: "under_13"
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("under_13_reporter_not_allowed_for_context");
  });

  it("marks appeal reversed report as invalid", () => {
    const result = verifySafetyReport(
      makeInput({
        appealReversed: true
      })
    );

    expect(result.status).toBe("invalid_report");
    expect(result.reasons).toContain("appeal_reversed_report");
  });
});
