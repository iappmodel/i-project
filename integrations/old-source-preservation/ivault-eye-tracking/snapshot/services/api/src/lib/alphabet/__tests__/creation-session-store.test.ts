import { beforeEach, describe, expect, it } from "vitest";
import {
  getCreationArtifact,
  getCreationVerificationResult,
  resetCreationStoreForTests,
  submitCreationArtifact,
  verifyStoredCreationArtifact
} from "../creation-session-store";

describe("creation-session-store", () => {
  beforeEach(() => {
    resetCreationStoreForTests();
  });

  it("submits creation artifact", () => {
    const artifact = submitCreationArtifact({
      userId: crypto.randomUUID(),
      creatorId: crypto.randomUUID(),
      artifactType: "video",
      ageBand: "18_plus",
      title: "Demo",
      description: "Demo artifact",
      aiAssisted: true,
      aiDisclosed: true
    });

    expect(artifact.status).toBe("submitted");

    const stored = getCreationArtifact(artifact.artifactId);
    expect(stored?.artifactId).toBe(artifact.artifactId);
  });

  it("verifies stored creation artifact", () => {
    const artifact = submitCreationArtifact({
      userId: crypto.randomUUID(),
      creatorId: crypto.randomUUID(),
      artifactType: "video",
      ageBand: "18_plus",
      title: "Demo",
      description: "Demo artifact",
      aiAssisted: true,
      aiDisclosed: true
    });

    const result = verifyStoredCreationArtifact({
      artifactId: artifact.artifactId,
      artifactExists: true,
      rightsScore: 0.9,
      originalityScore: 0.82,
      remixScore: 0.7,
      qualityScore: 0.86,
      usefulnessScore: 0.78,
      effortScore: 0.8,
      audienceValueScore: 0.72,
      plagiarismRisk: 0.03,
      copyrightRisk: 0.03,
      aiSpamRisk: 0.03,
      duplicateContentRisk: 0.04,
      manipulationRisk: 0.04,
      deviceIntegrityScore: 0.9
    });

    expect(result.status).toBe("quality_verified");

    const stored = getCreationVerificationResult(artifact.artifactId);
    expect(stored?.status).toBe("quality_verified");

    const updatedArtifact = getCreationArtifact(artifact.artifactId);
    expect(updatedArtifact?.status).toBe("verified");
  });
});
