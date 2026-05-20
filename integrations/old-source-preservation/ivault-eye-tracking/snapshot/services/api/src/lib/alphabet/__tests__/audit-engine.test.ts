import { describe, expect, it } from "vitest";
import {
  calculateAuditHash,
  canonicalize,
  derivePacketPrivacy,
  evaluateAuditRecord,
  sha256Hex
} from "../audit-engine";
import type { AuditSignalInput, EvidenceItem } from "../../../types/alphabet/audit.types";

function makeEvidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    evidenceItemId: crypto.randomUUID(),
    evidenceType: "event",
    sourceObjectId: crypto.randomUUID(),
    sourceEventId: crypto.randomUUID(),
    title: "Event evidence",
    summary: "Evidence summary",
    payload: { ok: true },
    privacySensitivity: "medium",
    redactionRequired: false,
    hash: "abc",
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function makeInput(overrides: Partial<AuditSignalInput> = {}): AuditSignalInput {
  const evidenceItems = [makeEvidence()];

  return {
    auditRecordId: crypto.randomUUID(),
    subjectType: "admin_command",
    subjectId: crypto.randomUUID(),
    auditCategory: "admin",
    severity: "normal",
    complianceStatus: "pending",
    retentionClass: "extended",
    actorUserId: crypto.randomUUID(),
    subjectOwnerUserId: crypto.randomUUID(),
    targetObjectId: crypto.randomUUID(),
    evidencePacketId: crypto.randomUUID(),
    evidenceItems,
    sourceEventIds: [crypto.randomUUID()],
    immutableHash: "hash",
    previousHash: null,
    chainSequence: 1,
    exportRequested: false,
    exportSafe: true,
    privacySensitivity: "medium",
    redactionRequired: false,
    legalHold: false,
    deletionEligibleAt: new Date(Date.now() + 100000).toISOString(),
    now: new Date().toISOString(),
    evidenceCompletenessScore: 0.9,
    hashValid: true,
    chainValid: true,
    fraudRisk: 0.01,
    safetyRisk: 0.01,
    complianceRisk: 0.01,
    paymentRisk: 0.01,
    privacyRisk: 0.01,
    childSafetyFlag: false,
    financialRecordFlag: false,
    legalRequestFlag: false,
    metadata: {},
    ...overrides
  };
}

describe("audit-engine", () => {
  it("completes clean audit", () => {
    const result = evaluateAuditRecord(makeInput());
    expect(result.status).toBe("audit_complete");
    expect(result.auditComplete).toBe(true);
    expect(result.auditRecordCompletedEvent?.eventType).toBe("audit_record_completed");
  });

  it("requires evidence packet for admin audit", () => {
    const result = evaluateAuditRecord(makeInput({ evidencePacketId: null }));
    expect(result.status).toBe("audit_incomplete");
    expect(result.reasons).toContain("evidence_packet_required");
  });

  it("requires review on invalid hash chain", () => {
    const result = evaluateAuditRecord(
      makeInput({
        hashValid: false,
        chainValid: false
      })
    );
    expect(result.status).toBe("audit_review_required");
    expect(result.reasons).toContain("hash_chain_invalid");
  });

  it("applies legal hold", () => {
    const result = evaluateAuditRecord(
      makeInput({
        legalHold: true,
        retentionClass: "legal_hold"
      })
    );
    expect(result.status).toBe("audit_legal_hold");
    expect(result.legalHoldApplied).toBe(true);
    expect(result.deletionEligible).toBe(false);
  });

  it("blocks restricted export", () => {
    const result = evaluateAuditRecord(
      makeInput({
        exportRequested: true,
        privacySensitivity: "restricted",
        exportSafe: false,
        redactionRequired: true,
        privacyRisk: 0.1
      })
    );
    expect(result.status).toBe("audit_export_blocked");
    expect(result.exportBlocked).toBe(true);
  });

  it("marks export ready when safe", () => {
    const result = evaluateAuditRecord(
      makeInput({
        exportRequested: true,
        exportSafe: true,
        privacyRisk: 0.01
      })
    );
    expect(result.status).toBe("audit_export_ready");
    expect(result.exportReady).toBe(true);
    expect(result.exportRecord).toBeTruthy();
  });

  it("escalates child safety audit", () => {
    const result = evaluateAuditRecord(
      makeInput({
        auditCategory: "safety",
        childSafetyFlag: true
      })
    );
    expect(result.status).toBe("audit_escalated");
    expect(result.escalated).toBe(true);
  });

  it("canonicalizes object deterministically", () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe(canonicalize({ a: 1, b: 2 }));
  });

  it("creates sha256 hash", async () => {
    const hash = await sha256Hex("hello");
    expect(hash).toHaveLength(64);
  });

  it("calculates deterministic audit hash", async () => {
    const a = await calculateAuditHash({
      subjectType: "wallet",
      subjectId: "1",
      targetObjectId: "2",
      auditCategory: "financial",
      evidencePacketId: "3",
      sourceEventIds: ["4"],
      previousHash: null,
      chainSequence: 1,
      payload: { b: 2, a: 1 }
    });

    const b = await calculateAuditHash({
      subjectType: "wallet",
      subjectId: "1",
      targetObjectId: "2",
      auditCategory: "financial",
      evidencePacketId: "3",
      sourceEventIds: ["4"],
      previousHash: null,
      chainSequence: 1,
      payload: { a: 1, b: 2 }
    });

    expect(a).toBe(b);
  });

  it("derives restricted packet privacy", () => {
    const privacy = derivePacketPrivacy([
      makeEvidence({ privacySensitivity: "restricted" })
    ]);
    expect(privacy.privacySensitivity).toBe("restricted");
    expect(privacy.redactionRequired).toBe(true);
  });
});
