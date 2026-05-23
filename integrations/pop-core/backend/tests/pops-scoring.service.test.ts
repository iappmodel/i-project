import { describe, expect, it } from "vitest";
import { PopsScoringService } from "../scoring/pops-scoring.service.js";
import {
  backgroundProgressAnomalyBatch,
  criticalFraudBatch,
  lowPresenceBatch,
  strongEngagedBatch
} from "./fixtures/signal-batches.js";

describe("PopsScoringService", () => {
  const scoringService = new PopsScoringService();

  it("returns confidences in [0, 1] for a strong engaged batch", () => {
    const result = scoringService.score(strongEngagedBatch);

    expect(result.presenceConfidence).toBeGreaterThanOrEqual(0);
    expect(result.presenceConfidence).toBeLessThanOrEqual(1);
    expect(result.attentionConfidence).toBeGreaterThanOrEqual(0.5);
    expect(result.intentConfidence).toBeGreaterThanOrEqual(0.3);
    expect(result.continuityConfidence).toBeGreaterThanOrEqual(0.7);
    expect(result.fraudRisk).toBeLessThan(0.4);
    expect(result.reasonCodes).not.toContain("app_backgrounded");
  });

  it("flags app_backgrounded when app is not foregrounded", () => {
    const result = scoringService.score(backgroundProgressAnomalyBatch);

    expect(result.reasonCodes).toContain("app_backgrounded");
    expect(result.fraudRisk).toBeGreaterThan(0.1);
  });

  it("raises fraud risk and adds device_integrity_low for low integrity", () => {
    const result = scoringService.score(criticalFraudBatch);

    expect(result.reasonCodes).toContain("device_integrity_low");
    expect(result.fraudRisk).toBeGreaterThanOrEqual(0.7);
    expect(result.reasonCodes).toContain("fraud_risk_critical");
  });

  it("flags screen_inactive and lowers presence for inactive screen", () => {
    const result = scoringService.score(lowPresenceBatch);

    expect(result.reasonCodes).toContain("screen_inactive");
    expect(result.presenceConfidence).toBeLessThan(0.5);
  });
});
