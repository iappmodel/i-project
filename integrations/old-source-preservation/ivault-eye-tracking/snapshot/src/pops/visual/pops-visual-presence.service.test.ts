import { describe, expect, it } from "vitest";
import { PopsVisualPresenceService, computeVisualPresenceScore } from "./pops-visual-presence.service";

describe("PopsVisualPresenceService", () => {
  it("keeps a brief glance-away from heavy penalties", () => {
    const service = new PopsVisualPresenceService();
    const baseTs = Date.now();

    const facePresent = service.compute({
      timestampMs: baseTs,
      facePresent: true,
      faceCount: 1,
      visualQuality: 0.9,
      lightingQuality: 0.8,
      cameraOcclusionRisk: 0.1,
      headPoseStability: 0.8,
      blinkNaturalnessScore: 0.7,
      gazeTowardScreenEstimate: 0.5,
      spoofRiskEstimate: 0.1,
      identityContinuityEstimate: 0.9,
      localProcessingUsed: true,
      rawFrameStored: false,
    });

    const briefGlance = service.compute(
      {
        timestampMs: baseTs + 1500,
        facePresent: false,
        faceCount: 0,
        visualQuality: 0.85,
        lightingQuality: 0.8,
        cameraOcclusionRisk: 0.15,
        headPoseStability: 0.7,
        blinkNaturalnessScore: 0.7,
        gazeTowardScreenEstimate: 0.1,
        spoofRiskEstimate: 0.1,
        identityContinuityEstimate: 0.88,
        localProcessingUsed: true,
        rawFrameStored: false,
      },
      { progressAdvancing: false },
    );

    expect(facePresent.visualPresenceScore).toBeGreaterThan(0);
    expect(briefGlance.visualPresenceScore).toBeGreaterThan(facePresent.visualPresenceScore - 25);
    expect(briefGlance.visualContinuityScore).toBeGreaterThan(0.5);
  });

  it("degrades confidence on repeated long face absence while progress advances", () => {
    const service = new PopsVisualPresenceService();
    const baseTs = Date.now();

    service.compute({
      timestampMs: baseTs,
      facePresent: true,
      faceCount: 1,
      visualQuality: 0.75,
      lightingQuality: 0.7,
      cameraOcclusionRisk: 0.2,
      headPoseStability: 0.6,
      blinkNaturalnessScore: 0.65,
      gazeTowardScreenEstimate: 0.4,
      spoofRiskEstimate: 0.15,
      identityContinuityEstimate: 0.8,
      localProcessingUsed: true,
      rawFrameStored: false,
    });

    const longAbsence1 = service.compute(
      {
        timestampMs: baseTs + 15000,
        facePresent: false,
        faceCount: 0,
        visualQuality: 0.7,
        lightingQuality: 0.7,
        cameraOcclusionRisk: 0.35,
        headPoseStability: 0.5,
        blinkNaturalnessScore: 0.6,
        gazeTowardScreenEstimate: 0.2,
        spoofRiskEstimate: 0.15,
        identityContinuityEstimate: 0.72,
        localProcessingUsed: true,
        rawFrameStored: false,
      },
      { progressAdvancing: true },
    );

    const longAbsence2 = service.compute(
      {
        timestampMs: baseTs + 30000,
        facePresent: false,
        faceCount: 0,
        visualQuality: 0.68,
        lightingQuality: 0.68,
        cameraOcclusionRisk: 0.4,
        headPoseStability: 0.45,
        blinkNaturalnessScore: 0.6,
        gazeTowardScreenEstimate: 0.2,
        spoofRiskEstimate: 0.2,
        identityContinuityEstimate: 0.65,
        localProcessingUsed: true,
        rawFrameStored: false,
      },
      { progressAdvancing: true },
    );

    expect(longAbsence1.reasons).toContain("FACE_MISSING_WHILE_PROGRESSING");
    expect(longAbsence2.visualPresenceScore).toBeLessThan(longAbsence1.visualPresenceScore);
    expect(service.getRepeatedLongAbsenceCount()).toBeGreaterThan(0);
  });

  it("flags high spoof risk and suggests hold/deny by proof level", () => {
    const strict = computeVisualPresenceScore(
      {
        timestampMs: Date.now(),
        facePresent: true,
        faceCount: 1,
        visualQuality: 0.8,
        lightingQuality: 0.7,
        cameraOcclusionRisk: 0.2,
        headPoseStability: 0.7,
        blinkNaturalnessScore: 0.7,
        gazeTowardScreenEstimate: 0.5,
        spoofRiskEstimate: 0.95,
        identityContinuityEstimate: 0.9,
        localProcessingUsed: true,
        rawFrameStored: false,
      },
      { proofLevel: "STRONG", highValueRewardFlow: true },
    );

    expect(strict.state).toBe("SPOOF_RISK");
    expect(strict.holdSuggested).toBe(true);
    expect(strict.denySuggested).toBe(true);
  });

  it("holds on multiple faces in high-value reward flows", () => {
    const result = computeVisualPresenceScore(
      {
        timestampMs: Date.now(),
        facePresent: true,
        faceCount: 2,
        visualQuality: 0.8,
        lightingQuality: 0.8,
        cameraOcclusionRisk: 0.15,
        headPoseStability: 0.75,
        blinkNaturalnessScore: 0.7,
        gazeTowardScreenEstimate: 0.6,
        spoofRiskEstimate: 0.35,
        identityContinuityEstimate: 0.88,
        localProcessingUsed: true,
        rawFrameStored: false,
      },
      { highValueRewardFlow: true },
    );

    expect(result.state).toBe("MULTIPLE_FACES");
    expect(result.holdSuggested).toBe(true);
    expect(result.reasons).toContain("MULTIPLE_FACES");
  });
});

