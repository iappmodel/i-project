import { beforeEach, describe, expect, it } from "vitest";
import {
  createContentRightsRecord,
  evaluateStoredContentRights,
  getContentRightsRecord,
  getContentRightsResult,
  listContentRightsRecordsForCreator,
  resetContentRightsStoreForTests,
  updateContentRightsEvidence
} from "../content-rights-store";

describe("content-rights-store", () => {
  beforeEach(() => {
    resetContentRightsStoreForTests();
  });

  function createBaseRecord() {
    const userId = crypto.randomUUID();
    const creatorId = crypto.randomUUID();

    return createContentRightsRecord({
      creatorId,
      userId,
      contentType: "video",
      rightsClaimType: "original",
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
      ]
    });
  }

  it("creates content rights record", () => {
    const record = createBaseRecord();

    expect(record.status).toBe("rights_created");

    const stored = getContentRightsRecord(record.contentRightsId);
    expect(stored?.contentRightsId).toBe(record.contentRightsId);
  });

  it("lists content rights records for creator", () => {
    const record = createBaseRecord();

    expect(listContentRightsRecordsForCreator(record.creatorId)).toHaveLength(1);
  });

  it("evaluates stored content rights", () => {
    const record = createBaseRecord();

    const result = evaluateStoredContentRights({
      contentRightsId: record.contentRightsId,
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
      monetizationRequested: true
    });

    expect(result.status).toBe("rights_verified");
    expect(result.monetizationApproved).toBe(true);

    const updated = getContentRightsRecord(record.contentRightsId);
    expect(updated?.status).toBe("rights_verified");

    const storedResult = getContentRightsResult(record.contentRightsId);
    expect(storedResult?.status).toBe("rights_verified");
  });

  it("updates evidence", () => {
    const record = createBaseRecord();

    const updated = updateContentRightsEvidence({
      contentRightsId: record.contentRightsId,
      licenseStatus: "verified",
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
    });

    expect(updated.licenseStatus).toBe("verified");
    expect(updated.licenseEvidence).toHaveLength(1);
  });

  it("stores blocked result", () => {
    const record = createBaseRecord();

    const result = evaluateStoredContentRights({
      contentRightsId: record.contentRightsId,
      copyrightRisk: 0.95,
      plagiarismRisk: 0.02,
      impersonationRisk: 0.01,
      monetizationRisk: 0.03,
      safetyRisk: 0.02,
      creatorTrustScore: 80,
      creatorUValueScore: 40,
      disputeOpened: false,
      takedownNoticeReceived: false,
      manualReviewRequested: false,
      monetizationRequested: true
    });

    expect(result.status).toBe("rights_blocked");

    const updated = getContentRightsRecord(record.contentRightsId);
    expect(updated?.status).toBe("rights_blocked");
  });
});
