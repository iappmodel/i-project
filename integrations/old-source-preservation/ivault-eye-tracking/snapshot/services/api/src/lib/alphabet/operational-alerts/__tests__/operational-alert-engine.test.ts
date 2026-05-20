import { describe, expect, it } from "vitest";
import { evaluateOperationalAlert } from "../operational-alert-engine";
import type { OperationalAlertSignalInput } from "@/types/alphabet/operational-alert.types";

function makeInput(overrides: Partial<OperationalAlertSignalInput> = {}): OperationalAlertSignalInput {
  return {
    alertType: "provider_unknown_without_review",
    alertSource: "system_timeline",
    linkedObjectIds: {
      externalTransferId: "11111111-1111-4111-1111-111111111111"
    },
    sourceAnomalyIds: ["anomaly_1"],
    sourceEventIds: [],
    evidence: { status: "provider_unknown" },
    redactedEvidence: { status: "provider_unknown" },
    publicSummary: "Provider unknown without review.",
    internalSummary: "Timeline anomaly detected.",
    riskScores: {
      alertConfidenceScore: 1,
      financialRiskScore: 1,
      userImpactScore: 1,
      platformRiskScore: 1,
      exploitabilityScore: 1,
      urgencyScore: 1,
      recurrenceRiskScore: 1
    },
    existingOpenAlertCount: 0,
    suppressRequested: false,
    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("operational-alert-engine", () => {
  it("creates or escalates high-severity payment alert with strong signals", () => {
    const result = evaluateOperationalAlert(makeInput());

    expect(result.shouldCreateAlert).toBe(true);
    expect(result.severity).toBe("critical");
    expect(result.priority).toBe("urgent");
    expect(result.assignedTeam).toBe("payments");
    expect(result.status === "alert_create" || result.status === "alert_escalate").toBe(true);
  });

  it("skips duplicate alert when duplicate risk is high", () => {
    const result = evaluateOperationalAlert(
      makeInput({
        existingOpenAlertCount: 4
      })
    );

    expect(result.status).toBe("alert_skip_duplicate");
  });

  it("suppresses low confidence alert", () => {
    const result = evaluateOperationalAlert(
      makeInput({
        riskScores: {
          alertConfidenceScore: 0.1,
          financialRiskScore: 0.1,
          userImpactScore: 0.1,
          platformRiskScore: 0.1,
          exploitabilityScore: 0.1,
          urgencyScore: 0.1,
          recurrenceRiskScore: 0.1
        }
      })
    );

    expect(result.status).toBe("alert_suppress");
  });

  it("fails when no active rule matches", () => {
    const result = evaluateOperationalAlert(
      makeInput({
        alertType: "not_a_real_alert_type" as OperationalAlertSignalInput["alertType"]
      })
    );

    expect(result.failed).toBe(true);
    expect(result.status).toBe("alert_fail");
  });
});
