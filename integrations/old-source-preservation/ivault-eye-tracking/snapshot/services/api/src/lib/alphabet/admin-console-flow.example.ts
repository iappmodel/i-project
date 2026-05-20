import {
  approveAdminCommand,
  createAdminCommand,
  createAdminQueueItem,
  evaluateStoredAdminCommand
} from "./admin-console-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromAdminCommand,
  createUValueEventFromAdminCommand
} from "./admin-console-event-factory";

const operatorUserId = crypto.randomUUID();
const targetContentSafetyId = crypto.randomUUID();
const reviewCaseId = crypto.randomUUID();

const queueItem = createAdminQueueItem({
  queueType: "safety",
  targetSystem: "content_safety",
  targetObjectId: targetContentSafetyId,
  title: "Restore content after review",
  summary: "A review decision produced a correction instruction.",
  priority: "high",
  sourceReviewCaseId: reviewCaseId,
  sourceEventIds: [crypto.randomUUID()]
});

const command = createAdminCommand({
  adminQueueItemId: queueItem.adminQueueItemId,
  operatorUserId,
  operatorRole: "safety_specialist",
  permissionScope: "safety",
  commandType: "restore",
  targetSystem: "content_safety",
  targetObjectId: targetContentSafetyId,
  commandReason: "Restoring content based on completed specialist review.",
  executionPayload: {
    exposureLevel: "public",
    recommendationEligible: true
  },
  sourceReviewCaseId: reviewCaseId,
  sourceEventIds: queueItem.sourceEventIds
});

approveAdminCommand({
  adminCommandId: command.adminCommandId,
  approvedByUserId: crypto.randomUUID()
});

const adminResult = evaluateStoredAdminCommand({
  adminCommandId: command.adminCommandId,
  riskScore: 0.15,
  severityScore: 0.2,
  evidenceCompletenessScore: 0.9,
  privacySensitivityScore: 0.2,
  targetOwnerUserId: crypto.randomUUID(),
  operatorHasQueueAccess: true,
  operatorHasTargetAccess: true,
  operatorHasExportPermission: false,
  duplicateCommandCount: 0,
  recentFailedCommandCount: 0,
  executionRequested: true,
  cancelRequested: false
});

const trustEvent = createTrustEventFromAdminCommand(adminResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromAdminCommand(adminResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

console.log("Admin command:");
console.log(JSON.stringify(adminResult, null, 2));

console.log("Operator Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(operatorUserId), null, 2));

console.log("Operator U Value:");
console.log(JSON.stringify(getOrCreateUValueState(operatorUserId), null, 2));
