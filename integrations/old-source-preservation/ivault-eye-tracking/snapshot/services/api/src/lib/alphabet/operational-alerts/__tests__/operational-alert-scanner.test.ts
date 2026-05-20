import { describe, expect, it } from "vitest";
import { operationalAlertTypeFromTimelineAnomaly } from "../operational-alert-scanner";

describe("operational-alert-scanner", () => {
  it("maps timeline anomaly types to operational alert types", () => {
    expect(operationalAlertTypeFromTimelineAnomaly("provider_unknown_without_review")).toBe(
      "provider_unknown_without_review"
    );
    expect(
      operationalAlertTypeFromTimelineAnomaly("provider_failure_without_compensation_or_review")
    ).toBe("provider_failure_without_compensation");
    expect(operationalAlertTypeFromTimelineAnomaly("compensation_without_reversal")).toBe(
      "compensation_completed_without_reversal"
    );
    expect(operationalAlertTypeFromTimelineAnomaly("ledger_without_execution")).toBe(
      "ledger_without_execution"
    );
    expect(operationalAlertTypeFromTimelineAnomaly("unreviewed_high_risk_state")).toBe(
      "audit_risk_high"
    );
    expect(operationalAlertTypeFromTimelineAnomaly("missing_link")).toBe("audit_risk_high");
    expect(operationalAlertTypeFromTimelineAnomaly("__future_type__" as never)).toBe(null);
  });
});
