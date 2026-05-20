import { describe, expect, it } from "vitest";
import { PopsOrchestrator } from "../pops-orchestrator";
import { POPS_PIPELINE_EVENT } from "../pops-pipeline-events";
import { popsScenarioFixtures } from "./fixtures/pops-session-fixtures";

describe("P.O.P.S Stage 16 - pipeline scenarios", () => {
  const orchestrator = new PopsOrchestrator();

  it.each(popsScenarioFixtures)("$id: $name", async (scenario) => {
    const output = await orchestrator.runPopsPipeline(scenario.pipelineInput);

    expect(scenario.session.state).toBe(scenario.expected.sessionState);
    expect(["APPROVED", "PENDING_REVIEW", "DENIED"]).toContain(output.rewardDecision.status);
    expect(["READY", "PENDING_REVIEW", "RETRY_SCHEDULED", "BLOCKED"]).toContain(output.walletIntent.status);
    expect(["INCREASE", "NO_CHANGE", "DECREASE", "PENDING"]).toContain(output.trustImpact.status);
    expect(Boolean(output.privacyReceipt)).toBe(scenario.expected.privacyReceiptExists);

    expect(output.judgment.scoreBreakdown.presence).toBeGreaterThanOrEqual(0);
    expect(output.judgment.scoreBreakdown.presence).toBeLessThanOrEqual(1);
    expect(output.judgment.scoreBreakdown.attention).toBeGreaterThanOrEqual(0);
    expect(output.judgment.scoreBreakdown.attention).toBeLessThanOrEqual(1);
    expect(output.judgment.scoreBreakdown.intent).toBeGreaterThanOrEqual(0);
    expect(output.judgment.scoreBreakdown.intent).toBeLessThanOrEqual(1);
    expect(output.judgment.scoreBreakdown.fraudRisk).toBeGreaterThanOrEqual(0);
    expect(output.judgment.scoreBreakdown.fraudRisk).toBeLessThanOrEqual(1);

    expect(output.pipelineEvents.at(0)?.name).toBe(POPS_PIPELINE_EVENT.STARTED);
    expect(output.pipelineEvents.at(-1)?.name).toBe(POPS_PIPELINE_EVENT.COMPLETED);
    expect(output.pipelineEvents.length).toBeGreaterThanOrEqual(8);
  });
});
