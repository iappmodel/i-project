import { describe, expect, it } from "vitest";
import { evaluateContentRights, normalizeAttributionRecipients } from "../content-rights-engine";
import type { ContentRightsSignalInput } from "../../../types/alphabet/content-rights.types";

function makeInput(
  overrides: Partial<ContentRightsSignalInput> = {}
): ContentRightsSignalInput {
  const userId = crypto.randomUUID();
  const creatorId = crypto.randomUUID();

  return {
    contentRightsId: crypto.randomUUID(),
    contentId: crypto.randomUUID(),
    creatorId,
    userId,
    contentType: "video",
    rightsClaimType: "original",
    licenseStatus: "none",
    safetyStatus: "clear",
    originalityScore: 0.9,
    attributionConfidenceScore: 0.85,
    transformationScore: 0.4,
    similarityScore: 0.08,
    knownSourceOverlapScore: 0.05,
    collaborators: [
      {
        userId,
        creatorId,
        role: "primary_creator",
        attributionRate: 1,
        evidenceScore: 0.9
      }
    ],
    externalSources: [],
    licenseEvidence: [],
    aiAssisted: false,
    aiAssistanceDisclosed: false,
    copyrightRisk: 0.02,
    plagiarismRisk: 0.02,
    impersonationRisk: 0.01,
    monetizationRisk: 0.03,
    safetyRisk: 0.02,
    creatorTrustScore: 80,
    creatorUValueScore: 40,
    disputeOpened: false,
    takedownNoticeReceived: false,
    manualReviewRequested: false,
    monetizationRequested: true,
    metadata: {},
    ...overrides
  };
}

describe("content-rights-engine", () => {
  it("verifies original content and approves monetization", () => {
    const result = evaluateContentRights(makeInput());

    expect(result.status).toBe("rights_verified");
    expect(result.monetizationApproved).toBe(true);
    expect(result.contentMonetizationApprovedEvent?.eventType).toBe(
      "content_monetization_approved"
    );
  });

  it("limits AI-assisted content without disclosure", () => {
    const result = evaluateContentRights(
      makeInput({
        rightsClaimType: "ai_assisted",
        aiAssisted: true,
        aiAssistanceDisclosed: false
      })
    );

    expect(result.status).toBe("rights_limited");
    expect(result.reasons).toContain("ai_assistance_disclosure_required");
  });

  it("approves AI-assisted content when disclosed and clean", () => {
    const result = evaluateContentRights(
      makeInput({
        rightsClaimType: "ai_assisted",
        aiAssisted: true,
        aiAssistanceDisclosed: true,
        transformationScore: 0.6
      })
    );

    expect(result.status).toBe("rights_verified");
    expect(result.monetizationApproved).toBe(true);
  });

  it("requires license evidence for licensed claim", () => {
    const result = evaluateContentRights(
      makeInput({
        rightsClaimType: "licensed",
        licenseStatus: "claimed",
        licenseEvidence: []
      })
    );

    expect(result.status).toBe("rights_pending_review");
    expect(result.reasons).toContain("verified_license_evidence_required");
  });

  it("verifies licensed claim with evidence", () => {
    const result = evaluateContentRights(
      makeInput({
        rightsClaimType: "licensed",
        licenseStatus: "verified",
        originalityScore: 0.4,
        similarityScore: 0.9,
        knownSourceOverlapScore: 0.9,
        licenseEvidence: [
          {
            evidenceId: crypto.randomUUID(),
            licenseName: "Commercial License",
            licensor: "Rights Holder",
            licenseUrl: "https://example.com/license",
            validFrom: null,
            validUntil: null,
            evidenceScore: 0.9,
            verified: true
          }
        ]
      })
    );

    expect(result.status).toBe("rights_verified");
    expect(result.monetizationApproved).toBe(true);
  });

  it("blocks high copyright risk", () => {
    const result = evaluateContentRights(
      makeInput({
        copyrightRisk: 0.95
      })
    );

    expect(result.status).toBe("rights_blocked");
    expect(result.contentCopyrightRiskDetectedEvent?.eventType).toBe(
      "content_copyright_risk_detected"
    );
  });

  it("disputes rights when dispute opened", () => {
    const result = evaluateContentRights(
      makeInput({
        disputeOpened: true
      })
    );

    expect(result.status).toBe("rights_disputed");
    expect(result.disputeRequired).toBe(true);
  });

  it("blocks monetization for fair use claim by default", () => {
    const result = evaluateContentRights(
      makeInput({
        rightsClaimType: "fair_use_claim",
        transformationScore: 0.8,
        attributionConfidenceScore: 0.9,
        similarityScore: 0.6,
        knownSourceOverlapScore: 0.6
      })
    );

    expect(result.monetizationApproved).toBe(false);
    expect(result.monetizationBlocked).toBe(true);
  });

  it("normalizes attribution recipients", () => {
    const normalized = normalizeAttributionRecipients([
      {
        userId: "a",
        role: "primary_creator",
        attributionRate: 70,
        evidenceScore: 1
      },
      {
        userId: "b",
        role: "collaborator",
        attributionRate: 30,
        evidenceScore: 1
      }
    ]);

    expect(normalized[0]?.attributionRate).toBe(0.7);
    expect(normalized[1]?.attributionRate).toBe(0.3);
  });
});
