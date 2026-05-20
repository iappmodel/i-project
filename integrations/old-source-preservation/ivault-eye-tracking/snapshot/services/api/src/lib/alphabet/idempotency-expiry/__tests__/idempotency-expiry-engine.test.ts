import { describe, expect, it } from "vitest";
import type { IdempotencyExpirySignalInput } from "@/types/alphabet/idempotency-expiry.types";
import { evaluateIdempotencyExpiry } from "../idempotency-expiry-engine";

const baseKeyMetadata: IdempotencyExpirySignalInput["keyMetadata"] = {
  keyId: "idem_1",
  keyType: "idempotency",
  scope: "content.like",
  keyValue: "idem_1",
  objectType: "reaction",
  objectId: "reaction_1",
  status: "completed",
  firstSeenAt: "2026-04-26T00:00:00.000Z",
  lastSeenAt: "2026-04-26T00:00:00.000Z",
  expiresAt: "2026-04-27T00:00:00.000Z",
  lockedAt: null,
  lockExpiresAt: null,
  hitCount: 1,
  conflictCount: 0,
  replayCount: 0
};

const baseRisk: IdempotencyExpirySignalInput["riskScores"] = {
  conflictRiskScore: 0,
  replayRiskScore: 0,
  abuseRiskScore: 0,
  financialRiskScore: 0,
  auditPreservationScore: 0.95,
  confidenceScore: 0.95
};

function makeInput(overrides: Partial<IdempotencyExpirySignalInput> = {}): IdempotencyExpirySignalInput {
  return {
    expiryType: "idempotency_key_expired",
    expiryScope: "idempotency",
    keyMetadata: { ...baseKeyMetadata, ...(overrides.keyMetadata ?? {}) },
    linkedObjectIds: { ...overrides.linkedObjectIds },
    riskScores: { ...baseRisk, ...(overrides.riskScores ?? {}) },
    evidence: {},
    redactedEvidence: {},
    sourceEventIds: [],
    expired: true,
    stale: false,
    conflictSpike: false,
    replaySpike: false,
    duplicateSpike: false,
    missingResult: false,
    resultMismatch: false,
    lockExpired: false,
    moneyScoped: false,
    auditCritical: false,
    now: "2026-04-27T01:00:00.000Z",
    metadata: {},
    ...overrides
  };
}

describe("idempotency-expiry-engine", () => {
  it("archives safe expired idempotency key", () => {
    const result = evaluateIdempotencyExpiry(makeInput());

    expect(result.status).toBe("expiry_archive");
    expect(result.decisions.shouldArchive).toBe(true);
  });

  it("marks money-scoped replay as critical", () => {
    const result = evaluateIdempotencyExpiry(
      makeInput({
        expiryType: "idempotency_key_replay_spike",
        keyMetadata: {
          ...baseKeyMetadata,
          scope: "wallet.withdrawal",
          replayCount: 5
        },
        replaySpike: true,
        moneyScoped: true,
        auditCritical: true,
        riskScores: {
          conflictRiskScore: 0.2,
          replayRiskScore: 1,
          abuseRiskScore: 0.9,
          financialRiskScore: 0.95,
          auditPreservationScore: 0.95,
          confidenceScore: 0.95
        }
      })
    );

    expect(result.status).toBe("expiry_critical");
    expect(result.decisions.shouldAlert).toBe(true);
    expect(result.decisions.shouldReview).toBe(true);
  });

  it("suppresses duplicate expired dedupe key", () => {
    const result = evaluateIdempotencyExpiry(
      makeInput({
        expiryType: "dedupe_key_expired",
        expiryScope: "dedupe",
        keyMetadata: {
          ...baseKeyMetadata,
          keyType: "dedupe",
          keyValue: "dedupe_1"
        },
        expired: true
      })
    );

    expect(result.status).toBe("expiry_suppress");
    expect(result.decisions.shouldSuppress).toBe(true);
  });

  it("skips low confidence", () => {
    const result = evaluateIdempotencyExpiry(
      makeInput({
        riskScores: {
          conflictRiskScore: 0,
          replayRiskScore: 0,
          abuseRiskScore: 0,
          financialRiskScore: 0,
          auditPreservationScore: 0.95,
          confidenceScore: 0.1
        }
      })
    );

    expect(result.status).toBe("expiry_skip");
  });
});
