import { describe, expect, it } from "vitest";
import { PopsOrchestrator } from "../pops-orchestrator";
import { popsScenarioFixtures } from "./fixtures/pops-session-fixtures";

describe("P.O.P.S Stage 16 - privacy scenarios", () => {
  const orchestrator = new PopsOrchestrator();

  it.each(popsScenarioFixtures)("$id: $name", async (scenario) => {
    const output = await orchestrator.runPopsPipeline(scenario.pipelineInput);

    expect(scenario.session.state).toBe(scenario.expected.sessionState);
    expect(Boolean(output.privacyReceipt)).toBe(scenario.expected.privacyReceiptExists);
    if (scenario.expected.privacyReceiptExists) {
      expect(output.privacyReceipt).not.toBeNull();
      expect(output.privacyReceipt?.reasonCodes).toContain("PRIVACY_RECEIPT_CREATED");
      expect(output.privacyReceipt?.rawSensitiveDataStored).toBe(false);
    }

    if (scenario.id === "late_events_after_completion") {
      expect(output.rewardDecision.status).toBe("APPROVED");
      expect(output.walletIntent.rewardDecisionPreserved).toBe(true);
    }

    if (scenario.id === "pipeline_failure") {
      expect(output.rewardDecision.status).toBe("PENDING_REVIEW");
      expect(output.privacyReceipt?.reasonCodes).toContain("PRIVACY_CAPTURED_DURING_SCORING_FAILURE");
    }
  });
});
