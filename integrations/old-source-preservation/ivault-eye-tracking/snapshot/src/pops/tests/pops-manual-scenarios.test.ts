import { describe, expect, it } from "vitest";
import { runAllPopsManualScenarios } from "./pops-manual-scenarios";

describe("P.O.P.S manual scenario runner", () => {
  it("runAllPopsManualScenarios completes without throw", () => {
    const all = runAllPopsManualScenarios();
    expect(all.clean.rewardDecision.decisionStatus).toBe("APPROVED_FULL");
    expect(all.clean.walletIntent?.status).toBe("PENDING");
    expect(all.partial.rewardDecision.decisionStatus).not.toBe("APPROVED_FULL");
    expect(["HELD", "DENIED_FRAUD_RISK"]).toContain(all.backgroundFraud.rewardDecision.decisionStatus);
    expect(all.impossible.rewardDecision.decisionStatus).toBe("DENIED_FRAUD_RISK");
    expect(all.impossible.walletIntent).toBeNull();
    const device = all.deviceWarning.rewardDecision.decisionStatus;
    expect(["HELD", "DENIED_FRAUD_RISK", "DENIED_LOW_CONFIDENCE"]).toContain(device);
  });
});
