import { describe, expect, it } from "vitest";
import { routeOperationalAlert } from "../operational-alert-router";
import type { OperationalAlertSignalInput } from "@/types/alphabet/operational-alert.types";

function baseSignal(
  overrides: Partial<OperationalAlertSignalInput> = {}
): OperationalAlertSignalInput {
  return {
    alertType: "provider_unknown_without_review",
    alertSource: "system_timeline",
    linkedObjectIds: {},
    sourceAnomalyIds: [],
    sourceEventIds: [],
    evidence: {},
    redactedEvidence: {},
    riskScores: {
      alertConfidenceScore: 1,
      financialRiskScore: 1,
      userImpactScore: 1,
      platformRiskScore: 1,
      exploitabilityScore: 0,
      urgencyScore: 1,
      recurrenceRiskScore: 0
    },
    existingOpenAlertCount: 0,
    suppressRequested: false,
    now: new Date().toISOString(),
    ...overrides
  };
}

describe("operational-alert-router", () => {
  it("routes provider unknown to payments", () => {
    const route = routeOperationalAlert(baseSignal());

    expect(route.assignedTeam).toBe("payments");
  });

  it("routes campaign budget invariant to policy", () => {
    const route = routeOperationalAlert(
      baseSignal({
        alertType: "campaign_budget_invariant_broken"
      })
    );

    expect(route.assignedTeam).toBe("policy");
  });

  it("routes wallet negative balance to wallet_ops", () => {
    const route = routeOperationalAlert(
      baseSignal({
        alertType: "wallet_negative_balance"
      })
    );

    expect(route.assignedTeam).toBe("wallet_ops");
  });
});
