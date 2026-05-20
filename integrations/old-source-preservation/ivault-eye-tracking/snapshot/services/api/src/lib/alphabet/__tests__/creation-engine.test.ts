import { describe, expect, it } from "vitest";
import { verifyCreationArtifact } from "../creation-engine";
import type { CreationSignalInput } from "../../../types/alphabet/creation.types";

function makeInput(
  overrides: Partial<CreationSignalInput> = {}
): CreationSignalInput {
  return {
    artifactId: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    creatorId: crypto.randomUUID(),
    artifactType: "video",
    artifactExists: true,
    rightsScore: 0.9,
    originalityScore: 0.82,
    remixScore: 0.7,
    qualityScore: 0.86,
    usefulnessScore: 0.78,
    effortScore: 0.8,
    audienceValueScore: 0.72,
    aiAssisted: true,
    aiDisclosed: true,
    plagiarismRisk: 0.03,
    copyrightRisk: 0.03,
    aiSpamRisk: 0.03,
    duplicateContentRisk: 0.04,
    manipulationRisk: 0.04,
    deviceIntegrityScore: 0.9,
    ageBand: "18_plus",
    metadata: {},
    ...overrides
  };
}

describe("creation-engine", () => {
  it("verifies high quality original creation", () => {
    const result = verifyCreationArtifact(makeInput());

    expect(result.status).toBe("quality_verified");
    expect(result.creationScore).toBeGreaterThan(0.6);
    expect(result.finalOriginalityScore).toBeGreaterThan(0.6);
    expect(result.finalQualityScore).toBeGreaterThan(0.55);
    expect(result.cCoinEvent?.eventType).toBe("ccoin_awarded");
    expect(result.oCoinEvent?.eventType).toBe("ocoin_awarded");
    expect(result.qCoinEvent?.eventType).toBe("qcoin_adjusted");
  });

  it("rejects missing artifact", () => {
    const result = verifyCreationArtifact(
      makeInput({
        artifactExists: false
      })
    );

    expect(result.status).toBe("rejected");
    expect(result.reasons).toContain("artifact_missing");
    expect(result.cCoinEvent).toBeNull();
  });

  it("needs review for low rights score", () => {
    const result = verifyCreationArtifact(
      makeInput({
        rightsScore: 0.2
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("rights_score_below_minimum");
  });

  it("flags plagiarism as suspicious", () => {
    const result = verifyCreationArtifact(
      makeInput({
        plagiarismRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("plagiarism_risk_above_maximum");
  });

  it("flags copyright risk as suspicious", () => {
    const result = verifyCreationArtifact(
      makeInput({
        copyrightRisk: 0.95
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("copyright_risk_above_maximum");
  });

  it("needs review if AI assistance is undisclosed", () => {
    const result = verifyCreationArtifact(
      makeInput({
        aiAssisted: true,
        aiDisclosed: false
      })
    );

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("ai_assistance_not_disclosed");
  });

  it("verifies creation but not originality if originality is low", () => {
    const result = verifyCreationArtifact(
      makeInput({
        originalityScore: 0.35,
        remixScore: 0.2
      })
    );

    expect(result.status).toBe("creation_verified");
    expect(result.cCoinEvent).toBeTruthy();
    expect(result.oCoinEvent).toBeNull();
    expect(result.qCoinEvent).toBeNull();
  });

  it("verifies originality but not quality if quality is low", () => {
    const result = verifyCreationArtifact(
      makeInput({
        qualityScore: 0.25,
        usefulnessScore: 0.25
      })
    );

    expect(result.status).toBe("originality_verified");
    expect(result.cCoinEvent).toBeTruthy();
    expect(result.oCoinEvent).toBeTruthy();
    expect(result.qCoinEvent).toBeNull();
  });

  it("blocks under 13 course creation", () => {
    const result = verifyCreationArtifact(
      makeInput({
        artifactType: "course",
        ageBand: "under_13"
      })
    );

    expect(result.status).toBe("suspicious");
    expect(result.reasons).toContain("under_13_not_allowed_for_artifact_type");
  });
});
