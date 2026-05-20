import { describe, expect, it } from "vitest";
import { PopsOrchestrator } from "../pops-orchestrator";
import { popsScenarioFixtures } from "./fixtures/pops-session-fixtures";

describe("P.O.P.S Stage 16 - trust scenarios", () => {
  const orchestrator = new PopsOrchestrator();

  it.each(popsScenarioFixtures)("$id: $name", async (scenario) => {
    const output = await orchestrator.runPopsPipeline(scenario.pipelineInput);

    expect(scenario.session.state).toBe(scenario.expected.sessionState);
    expect(["INCREASE", "NO_CHANGE", "DECREASE", "PENDING"]).toContain(output.trustImpact.status);
    expect(output.trustImpact.reasonCodes.length).toBeGreaterThan(0);
    expect(output.judgment.scoreBreakdown.fraudRisk).toBeGreaterThanOrEqual(0);
    expect(output.judgment.scoreBreakdown.fraudRisk).toBeLessThanOrEqual(1);

    if (scenario.id === "background_progress" || scenario.id === "instant_completion") {
      expect(["DECREASE", "NO_CHANGE"]).toContain(output.trustImpact.status);
    }
    if (scenario.id === "clean_paid_watch_session" || scenario.id === "cta_after_dwell") {
      expect(["INCREASE", "NO_CHANGE"]).toContain(output.trustImpact.status);
    }
  });
});
