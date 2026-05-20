import { beforeEach, describe, expect, it } from "vitest";
import {
  createAuditRecord,
  createEvidenceItem,
  createEvidencePacket,
  evaluateStoredAuditRecord,
  getAuditEvaluationResult,
  getAuditRecord,
  getEvidencePacket,
  listAuditRecords,
  resetAuditStoreForTests
} from "../audit-store";

describe("audit-store", () => {
  beforeEach(() => {
    resetAuditStoreForTests();
  });

  it("creates evidence item and packet", async () => {
    const item = await createEvidenceItem({
      evidenceType: "admin_command",
      title: "Admin command",
      summary: "Admin command summary",
      payload: { command: "restore" }
    });

    expect(item.hash).toHaveLength(64);

    const packet = createEvidencePacket({
      subjectType: "admin_command",
      subjectId: crypto.randomUUID(),
      actorUserId: crypto.randomUUID(),
      evidenceItems: [item]
    });

    expect(packet.evidenceItems).toHaveLength(1);

    const stored = getEvidencePacket(packet.evidencePacketId);
    expect(stored?.evidencePacketId).toBe(packet.evidencePacketId);
  });

  it("creates audit record with hash chain", async () => {
    const item = await createEvidenceItem({
      evidenceType: "event",
      title: "Event",
      summary: "Event summary",
      payload: { ok: true }
    });

    const packet = createEvidencePacket({
      subjectType: "admin_command",
      subjectId: "subject_1",
      evidenceItems: [item]
    });

    const record = await createAuditRecord({
      subjectType: "admin_command",
      subjectId: "subject_1",
      auditCategory: "admin",
      severity: "normal",
      targetObjectId: "target_1",
      evidencePacketId: packet.evidencePacketId,
      sourceEventIds: ["event_1"]
    });

    expect(record.immutableHash).toHaveLength(64);
    expect(record.chainSequence).toBe(1);

    const second = await createAuditRecord({
      subjectType: "admin_command",
      subjectId: "subject_2",
      auditCategory: "admin",
      severity: "normal",
      targetObjectId: "target_2",
      evidencePacketId: packet.evidencePacketId,
      sourceEventIds: ["event_2"]
    });

    expect(second.previousHash).toBe(record.immutableHash);
    expect(second.chainSequence).toBe(2);
  });

  it("evaluates stored audit record", async () => {
    const item = await createEvidenceItem({
      evidenceType: "event",
      title: "Event",
      summary: "Event summary",
      payload: { ok: true }
    });

    const packet = createEvidencePacket({
      subjectType: "admin_command",
      subjectId: "subject_1",
      evidenceItems: [item]
    });

    const record = await createAuditRecord({
      subjectType: "admin_command",
      subjectId: "subject_1",
      auditCategory: "admin",
      severity: "normal",
      targetObjectId: "target_1",
      evidencePacketId: packet.evidencePacketId,
      sourceEventIds: ["event_1"]
    });

    const result = await evaluateStoredAuditRecord({
      auditRecordId: record.auditRecordId,

      exportRequested: false,

      hashValid: true,
      chainValid: true,

      fraudRisk: 0.01,
      safetyRisk: 0.01,
      complianceRisk: 0.01,
      paymentRisk: 0.01,
      privacyRisk: 0.01,
      evidenceCompletenessScore: 0.95,

      childSafetyFlag: false,
      financialRecordFlag: false,
      legalRequestFlag: false
    });

    expect(result.status).toBe("audit_complete");

    const updated = getAuditRecord(record.auditRecordId);
    expect(updated?.status).toBe("audit_complete");

    const storedResult = getAuditEvaluationResult(record.auditRecordId);
    expect(storedResult?.status).toBe("audit_complete");
  });

  it("lists audit records", async () => {
    const item = await createEvidenceItem({
      evidenceType: "event",
      title: "Event",
      summary: "Event summary",
      payload: { ok: true }
    });

    const packet = createEvidencePacket({
      subjectType: "admin_command",
      subjectId: "subject_1",
      evidenceItems: [item]
    });

    await createAuditRecord({
      subjectType: "admin_command",
      subjectId: "subject_1",
      auditCategory: "admin",
      severity: "normal",
      targetObjectId: "target_1",
      evidencePacketId: packet.evidencePacketId
    });

    expect(listAuditRecords({ auditCategory: "admin" })).toHaveLength(1);
    expect(listAuditRecords({ subjectType: "admin_command" })).toHaveLength(1);
  });

  it("marks export ready", async () => {
    const item = await createEvidenceItem({
      evidenceType: "event",
      title: "Event",
      summary: "Event summary",
      payload: { ok: true },
      privacySensitivity: "low"
    });

    const packet = createEvidencePacket({
      subjectType: "notification",
      subjectId: "subject_1",
      evidenceItems: [item]
    });

    const record = await createAuditRecord({
      subjectType: "notification",
      subjectId: "subject_1",
      auditCategory: "notification",
      severity: "normal",
      targetObjectId: "target_1",
      evidencePacketId: packet.evidencePacketId,
      exportSafe: true
    });

    const result = await evaluateStoredAuditRecord({
      auditRecordId: record.auditRecordId,
      exportRequested: true,
      hashValid: true,
      chainValid: true,
      fraudRisk: 0.01,
      safetyRisk: 0.01,
      complianceRisk: 0.01,
      paymentRisk: 0.01,
      privacyRisk: 0.01,
      evidenceCompletenessScore: 0.95,
      childSafetyFlag: false,
      financialRecordFlag: false,
      legalRequestFlag: false
    });

    expect(result.status).toBe("audit_export_ready");
    expect(result.exportRecord).toBeTruthy();
  });
});
