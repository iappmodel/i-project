import {
  createAuditRecord,
  createEvidenceItem,
  createEvidencePacket,
  evaluateStoredAuditRecord
} from "./audit-store";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  createTrustEventFromAuditResult,
  createUValueEventFromAuditResult
} from "./audit-event-factory";

async function runAuditFlowExample(): Promise<void> {
  const operatorUserId = crypto.randomUUID();
  const adminCommandId = crypto.randomUUID();
  const targetObjectId = crypto.randomUUID();

  const evidenceItem = await createEvidenceItem({
    evidenceType: "admin_command",
    sourceObjectId: adminCommandId,
    sourceEventId: crypto.randomUUID(),
    title: "Admin restore command",
    summary: "Operator restored content after completed review.",
    payload: {
      commandType: "restore",
      targetSystem: "content_safety",
      targetObjectId,
      reasonCode: "review_restored_content"
    },
    privacySensitivity: "medium",
    redactionRequired: false
  });

  const packet = createEvidencePacket({
    subjectType: "admin_command",
    subjectId: adminCommandId,
    actorUserId: operatorUserId,
    evidenceItems: [evidenceItem]
  });

  const auditRecord = await createAuditRecord({
    subjectType: "admin_command",
    subjectId: adminCommandId,
    auditCategory: "admin",
    severity: "normal",
    complianceStatus: "pending",
    actorUserId: operatorUserId,
    targetObjectId,
    evidencePacketId: packet.evidencePacketId,
    sourceEventIds: [evidenceItem.sourceEventId ?? crypto.randomUUID()],
    exportSafe: true,
    payload: {
      action: "restore",
      targetObjectId
    }
  });

  const auditResult = await evaluateStoredAuditRecord({
    auditRecordId: auditRecord.auditRecordId,

    exportRequested: false,

    hashValid: true,
    chainValid: true,

    fraudRisk: 0.01,
    safetyRisk: 0.05,
    complianceRisk: 0.02,
    paymentRisk: 0.01,
    privacyRisk: 0.1,
    evidenceCompletenessScore: 0.95,

    childSafetyFlag: false,
    financialRecordFlag: false,
    legalRequestFlag: false
  });

  const trustEvent = createTrustEventFromAuditResult(auditResult);
  if (trustEvent) applyTrustImpactEventToUser(trustEvent);

  const uValueEvent = createUValueEventFromAuditResult(auditResult);
  if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

  console.log("Audit:");
  console.log(JSON.stringify(auditResult, null, 2));

  console.log("System Trust:");
  console.log(JSON.stringify(getOrCreateTrustScore("system"), null, 2));

  console.log("System U Value:");
  console.log(JSON.stringify(getOrCreateUValueState("system"), null, 2));
}

void runAuditFlowExample();
