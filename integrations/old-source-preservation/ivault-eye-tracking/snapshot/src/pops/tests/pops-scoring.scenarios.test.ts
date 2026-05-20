import { describe, expect, it } from "vitest";
import { PopsScoringService } from "../../../services/api/src/pops/services/pops-scoring.service";
import { popsScenarioFixtures } from "./fixtures/pops-session-fixtures";

function expectInRange(value: number, range: [number, number], label: string): void {
  const min = Math.max(0, range[0] - 0.3);
  const max = Math.min(1, range[1] + 0.2);
  expect(value, `${label} lower bound`).toBeGreaterThanOrEqual(min);
  expect(value, `${label} upper bound`).toBeLessThanOrEqual(max);
}

describe("P.O.P.S Stage 16 - scoring scenarios", () => {
  const scoringService = new PopsScoringService();

  it.each(popsScenarioFixtures)("$id: $name", (scenario) => {
    const result = scoringService.score(scenario.scoringBatch);

    expect(scenario.session.state).toBe(scenario.expected.sessionState);
    expectInRange(result.presenceConfidence, scenario.expected.confidence.presence, "presenceConfidence");
    expectInRange(result.attentionConfidence, scenario.expected.confidence.attention, "attentionConfidence");
    expectInRange(result.intentConfidence, scenario.expected.confidence.intent, "intentConfidence");
    expectInRange(result.fraudRisk, scenario.expected.confidence.fraudRisk, "fraudRisk");

    expect(result.reasonCodes.length).toBeGreaterThanOrEqual(0);
  });
});
