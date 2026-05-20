import { describe, expect, it } from "vitest";
import { PopsOrchestrator } from "../pops-orchestrator";
import { popsScenarioFixtures } from "./fixtures/pops-session-fixtures";

describe("P.O.P.S Stage 16 - reward decision scenarios", () => {
  const orchestrator = new PopsOrchestrator();

  it.each(popsScenarioFixtures)("$id: $name", async (scenario) => {
    const output = await orchestrator.runPopsPipeline(scenario.pipelineInput);

    expect(scenario.session.state).toBe(scenario.expected.sessionState);
    expect(["APPROVED", "PENDING_REVIEW", "DENIED"]).toContain(output.rewardDecision.status);
    expect(["READY", "PENDING_REVIEW", "RETRY_SCHEDULED", "BLOCKED"]).toContain(output.walletIntent.status);
    expect(["INCREASE", "NO_CHANGE", "DECREASE", "PENDING"]).toContain(output.trustImpact.status);
    expect(Boolean(output.privacyReceipt)).toBe(scenario.expected.privacyReceiptExists);

    const reasonSurface = [
      ...output.judgment.reasonCodes,
      ...output.rewardDecision.reasonCodes,
      ...output.walletIntent.reasonCodes,
      ...output.trustImpact.reasonCodes,
      ...(output.privacyReceipt?.reasonCodes ?? [])
    ];
    expect(reasonSurface.length).toBeGreaterThan(0);
  });
});
