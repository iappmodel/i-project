import { describe, expect, it } from "vitest";
import { PopsOrchestrator } from "../pops-orchestrator";
import { popsScenarioFixtures } from "./fixtures/pops-session-fixtures";

describe("P.O.P.S Stage 16 - wallet scenarios", () => {
  const orchestrator = new PopsOrchestrator();

  it.each(popsScenarioFixtures)("$id: $name", async (scenario) => {
    const output = await orchestrator.runPopsPipeline(scenario.pipelineInput);

    expect(scenario.session.state).toBe(scenario.expected.sessionState);
    expect(["READY", "PENDING_REVIEW", "RETRY_SCHEDULED", "BLOCKED"]).toContain(output.walletIntent.status);
    expect(output.walletIntent.reasonCodes.length).toBeGreaterThan(0);
    expect(output.walletIntent.rewardDecisionPreserved).toBe(true);

    if (scenario.expected.rewardDecision === "DENIED") {
      expect(output.walletIntent.status).toBe("BLOCKED");
      expect(output.walletIntent.amountMinor).toBe(0);
    } else {
      expect(output.walletIntent.amountMinor).toBeGreaterThanOrEqual(0);
    }
  });
});
