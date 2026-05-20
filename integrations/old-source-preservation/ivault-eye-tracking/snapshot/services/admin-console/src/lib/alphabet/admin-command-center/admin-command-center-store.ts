import type {
  AdminCommandDecisionInput,
  AdminCommandItemInput,
  AdminCommandQueueSummary
} from "@/types/alphabet/admin-command-center.types";
import type { Json } from "@/types/alphabet/database.types";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import { evaluateAdminCommandDecision } from "./admin-command-center-engine";
import { adminCommandCenterFail } from "./admin-command-center-errors";
import {
  coerceCommandSeverity,
  inferQueueScope,
  normalizeRecommendedActions,
  severityToPriority,
  isOpenStatus
} from "./admin-command-center-normalizers";
import { buildAdminCommandItemCreatedEvent } from "./admin-command-center-event-factory";
import {
  fetchCommandCenterSourceRowsDb,
  findAdminCommandItemBySourceDb,
  getAdminCommandDecisionByIdempotencyDb,
  getAdminCommandItemDb,
  insertAdminCommandDecisionDb,
  insertAdminCommandItemDb,
  insertAdminCommandNoteDb,
  listAdminCommandItemsDb,
  listAdminCommandItemTimelineDb,
  updateAdminCommandItemDb
} from "../db-repositories/admin-command-center.repository";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import { createAdminReviewCaseInStore } from "../admin-review/admin-review-store";

async function persistEvent(event: AlphabetEvent): Promise<string> {
  const saved = await insertAlphabetEvent({
    eventId: event.eventId,
    userId: event.userId,
    coinCode: event.coinCode ?? null,
    eventType: event.eventType,
    objectType: event.objectType ?? null,
    objectId: event.objectId ?? null,
    sourceContext: event.sourceContext,
    rawScore: event.rawScore ?? null,
    qualityScore: event.qualityScore ?? null,
    trustScoreAtEvent: event.trustScoreAtEvent ?? null,
    riskScore: event.riskScore ?? null,
    ageBand: event.ageBand ?? null,
    verificationStatus: event.verificationStatus,
    metadata: event.metadata ?? {}
  });

  return saved.event_id;
}

export async function createAdminCommandItem(input: AdminCommandItemInput) {
  const item = await insertAdminCommandItemDb({
    itemType: input.itemType,
    queueScope: input.queueScope,
    status: input.status ?? "command_item_open",
    severity: input.severity,
    priority: input.priority,
    title: input.title,
    summary: input.summary,
    linkedObjectIds: input.linkedObjectIds as Record<string, string | null | undefined>,
    sourceObjectType: input.sourceObjectType ?? null,
    sourceObjectId: input.sourceObjectId ?? null,
    recommendedActions: input.recommendedActions,
    evidence: input.evidence,
    redactedEvidence: input.redactedEvidence,
    sourceEventIds: input.sourceEventIds ?? [],
    linkedAlertIds: input.linkedAlertIds ?? [],
    linkedReviewCaseIds: input.linkedReviewCaseIds ?? [],
    dueAt: input.dueAt ?? null,
    reasonCodes: input.reasonCodes ?? [],
    tags: input.tags ?? [],
    metadata: input.metadata ?? {}
  });

  const envelope = buildAdminCommandItemCreatedEvent({
    commandItemId: String(item.command_item_id),
    input
  });
  await persistEvent(envelope);

  return item;
}

export async function listAdminCommandItems(params?: {
  status?: string | null;
  severity?: string | null;
  priority?: string | null;
  queueScope?: string | null;
  assignedToAdminId?: string | null;
  limit?: number;
}) {
  return listAdminCommandItemsDb(params);
}

export async function getAdminCommandItem(commandItemId: string) {
  const item = await getAdminCommandItemDb(commandItemId);
  if (!item) return null;

  const timeline = await listAdminCommandItemTimelineDb(commandItemId);

  return {
    item,
    timeline
  };
}

export async function getAdminCommandCenterSummary(
  actorAdminId?: string | null
): Promise<AdminCommandQueueSummary> {
  const items = await listAdminCommandItemsDb({
    limit: 1000
  });

  const open = items.filter((row) => isOpenStatus(String(row.status)));

  return {
    totalOpen: open.length,
    urgentCount: open.filter((row) => row.priority === "urgent").length,
    criticalCount: open.filter((row) => row.severity === "critical").length,
    assignedToMeCount: actorAdminId
      ? open.filter((row) => row.assigned_to_admin_id === actorAdminId).length
      : 0,
    waitingForEvidenceCount: open.filter((row) => row.status === "command_item_waiting_for_evidence").length,
    actionRecommendedCount: open.filter((row) => row.status === "command_item_action_recommended").length,
    financeCount: open.filter((row) => row.queue_scope === "finance").length,
    walletCount: open.filter((row) => row.queue_scope === "wallet").length,
    payoutCount: open.filter((row) => row.queue_scope === "payout").length,
    complianceCount: open.filter((row) => row.queue_scope === "compliance").length,
    systemCount: open.filter((row) => row.queue_scope === "system").length
  };
}

function readAssigneeFromAfterState(afterState: unknown, fallback: string): string {
  if (afterState && typeof afterState === "object" && "assignedToAdminId" in afterState) {
    const v = (afterState as { assignedToAdminId?: unknown }).assignedToAdminId;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

function readPriorityFromAfterState(afterState: unknown): string | null {
  if (afterState && typeof afterState === "object" && "priority" in afterState) {
    const v = (afterState as { priority?: unknown }).priority;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function applyAdminCommandDecision(input: AdminCommandDecisionInput) {
  const existing = await getAdminCommandDecisionByIdempotencyDb(input.idempotencyKey);
  if (existing) {
    const item = await getAdminCommandItemDb(input.commandItemId);
    return {
      item,
      decision: existing,
      eventId: null,
      evaluation: null,
      followupReviewCase: null,
      idempotentReplay: true as const
    };
  }

  const item = await getAdminCommandItemDb(input.commandItemId);

  if (!item) {
    adminCommandCenterFail({
      code: "admin_command_item_not_found",
      message: "Admin command item not found."
    });
  }

  const evaluation = evaluateAdminCommandDecision(input);

  if (!evaluation.allowed) {
    adminCommandCenterFail({
      code: "admin_command_decision_not_allowed",
      message: "Admin command decision is not allowed.",
      reasonCodes: evaluation.reasons
    });
  }

  const eventId = await persistEvent(evaluation.event);

  const beforeState = item;

  const patch: Record<string, unknown> = {
    status: evaluation.nextStatus
  };

  if (input.decisionType === "item_assignment") {
    const assignee = readAssigneeFromAfterState(input.afterState, input.actorAdminId);
    patch.assigned_to_admin_id = assignee;
    patch.assigned_by_admin_id = input.actorAdminId;
    patch.assigned_at = new Date().toISOString();
  }

  if (input.decisionType === "priority_change") {
    const afterPriority = readPriorityFromAfterState(input.afterState);
    if (afterPriority) patch.priority = afterPriority;
  }

  if (input.decisionType === "recommended_action_approved" && input.approvedAction) {
    const prev = (item.approved_actions as string[] | undefined) ?? [];
    patch.approved_actions = [...new Set([...prev, input.approvedAction])];
  }

  if (input.decisionType === "recommended_action_rejected" && input.rejectedAction) {
    const prev = (item.rejected_actions as string[] | undefined) ?? [];
    patch.rejected_actions = [...new Set([...prev, input.rejectedAction])];
  }

  if (input.decisionType === "item_resolved") {
    patch.resolved_at = new Date().toISOString();
    patch.resolved_by_admin_id = input.actorAdminId;
  }

  if (input.decisionType === "item_dismissed") {
    patch.dismissed_at = new Date().toISOString();
    patch.dismissed_by_admin_id = input.actorAdminId;
  }

  if (input.decisionType === "item_escalated" || input.decisionType === "followup_review_created") {
    patch.escalated_at = new Date().toISOString();
    patch.escalated_by_admin_id = input.actorAdminId;
  }

  const updated = await updateAdminCommandItemDb({
    commandItemId: input.commandItemId,
    patch
  });

  let followupReviewCase: ReturnType<typeof createAdminReviewCaseInStore> | null = null;

  if (input.executableAction === "create_followup_review_case") {
    followupReviewCase = createAdminReviewCaseInStore({
      review_case_type: "manual_admin_action_review",
      review_trigger: "system_uncertainty",
      user_id: input.linkedObjectIds.userId ?? null,
      wallet_id: input.linkedObjectIds.walletId ?? null,
      external_transfer_id: input.linkedObjectIds.externalTransferId ?? null,
      compensation_id: null,
      policy_decision_id: input.linkedObjectIds.policyDecisionId ?? null,
      pipeline_id: null,
      saga_id: null,
      execution_request_id: null,
      raw_evidence: {
        commandItemId: input.commandItemId,
        decision: input,
        sourceItem: item
      },
      internal_summary: `Follow-up review created from command item ${input.commandItemId}.`,
      severity: item.severity === "critical" ? "critical" : "high",
      priority: item.priority === "urgent" ? "urgent" : "high",
      source_event_ids: [eventId],
      metadata: {
        commandItemId: input.commandItemId
      }
    });
  }

  const decision = await insertAdminCommandDecisionDb({
    commandItemId: input.commandItemId,
    actorAdminId: input.actorAdminId,
    actorRole: input.actorRole,
    decisionType: input.decisionType,
    decisionStatus: evaluation.decisionStatus,
    requestedAction: input.requestedAction ?? null,
    approvedAction: input.approvedAction ?? null,
    rejectedAction: input.rejectedAction ?? null,
    reasonCodes: input.reasonCodes,
    evidenceSummary: input.evidenceSummary,
    linkedObjectIds: input.linkedObjectIds as never,
    beforeState: beforeState as never,
    afterState: updated as never,
    idempotencyKey: input.idempotencyKey,
    dedupeKey: input.dedupeKey,
    sourceEventIds: [eventId],
    metadata: {
      evaluation,
      followupReviewCaseId: followupReviewCase?.review_case_id ?? null,
      ...(input.metadata as Record<string, unknown> | undefined)
    } as never
  });

  return {
    item: updated,
    decision,
    eventId,
    evaluation,
    followupReviewCase,
    idempotentReplay: false as const
  };
}

export async function addAdminCommandNote(params: {
  commandItemId: string;
  actorAdminId: string;
  actorRole: string;
  noteBody: string;
  visibility?: string;
  evidenceRefs?: unknown;
}) {
  const item = await getAdminCommandItemDb(params.commandItemId);

  if (!item) {
    adminCommandCenterFail({
      code: "admin_command_item_not_found",
      message: "Admin command item not found."
    });
  }

  const eventEnvelope: AlphabetEvent = {
    eventId: `alphabet_event_${crypto.randomUUID()}`,
    userId: String(item.user_id ?? params.actorAdminId),
    coinCode: "J",
    eventType: "admin_command_note_added",
    objectType: "admin_command_item",
    objectId: params.commandItemId,
    sourceContext: "admin_command_center",
    rawScore: 1,
    qualityScore: 1,
    trustScoreAtEvent: null,
    riskScore: 0,
    ageBand: "unknown",
    verificationStatus: "verified",
    metadata: {
      commandItemId: params.commandItemId,
      actorAdminId: params.actorAdminId,
      actorRole: params.actorRole
    },
    createdAt: new Date().toISOString()
  };

  const eventId = await persistEvent(eventEnvelope);

  return insertAdminCommandNoteDb({
    commandItemId: params.commandItemId,
    actorAdminId: params.actorAdminId,
    actorRole: params.actorRole,
    noteBody: params.noteBody,
    visibility: params.visibility ?? "internal",
    evidenceRefs: (params.evidenceRefs ?? []) as never,
    sourceEventIds: [eventId]
  });
}

function mapReviewPriorityToCommand(p: string): "low" | "normal" | "high" | "urgent" {
  const v = String(p).toLowerCase();
  if (v === "urgent") return "urgent";
  if (v === "high") return "high";
  if (v === "low") return "low";
  return "normal";
}

export async function syncCommandCenterQueueFromSources() {
  const rows = await fetchCommandCenterSourceRowsDb();
  const created: unknown[] = [];

  for (const alert of rows.operationalAlerts) {
    const sourceType = "operational_alert";
    const sourceId = alert.alert_id;
    if (findAdminCommandItemBySourceDb(sourceType, sourceId)) continue;

    const sev = coerceCommandSeverity(alert.severity);
    created.push(
      await createAdminCommandItem({
        itemType: "operational_alert",
        queueScope: inferQueueScope({
          itemType: "operational_alert",
          alertType: alert.alert_type,
          sourceObjectType: alert.alert_source
        }),
        severity: sev,
        priority: mapReviewPriorityToCommand(alert.priority) ?? severityToPriority(sev),
        title: `Operational alert: ${alert.alert_type}`,
        summary: alert.internal_summary ?? alert.public_summary ?? "Operational alert requires review.",
        linkedObjectIds: {
          userId: alert.user_id ?? null,
          walletId: alert.wallet_id ?? null,
          externalTransferId: alert.external_transfer_id ?? null,
          alertId: alert.alert_id
        },
        sourceObjectType: sourceType,
        sourceObjectId: sourceId,
        recommendedActions: ["monitor", "create_manual_repair_task"],
        evidence: {
          redacted_evidence: alert.redacted_evidence ?? {},
          risk_scores: alert.risk_scores ?? {}
        } as unknown as Json,
        redactedEvidence: (alert.redacted_evidence ?? {}) as unknown as Json,
        sourceEventIds: [],
        linkedAlertIds: [alert.alert_id],
        reasonCodes: ["command_center_imported_operational_alert"],
        metadata: { source: "risk_inbox_alerts" }
      })
    );
  }

  for (const review of rows.adminReviewCases) {
    const sourceType = "admin_review_case";
    const sourceId = review.review_case_id;
    if (findAdminCommandItemBySourceDb(sourceType, sourceId)) continue;

    const sev = coerceCommandSeverity(review.severity);
    created.push(
      await createAdminCommandItem({
        itemType: "admin_review_case",
        queueScope: inferQueueScope({
          itemType: "admin_review_case",
          reviewCaseType: review.review_case_type
        }),
        severity: sev,
        priority: mapReviewPriorityToCommand(review.priority) ?? severityToPriority(sev),
        title: `Review case: ${review.review_case_type}`,
        summary: review.internal_summary ?? review.public_summary ?? "Admin review case requires action.",
        linkedObjectIds: {
          userId: review.user_id ?? null,
          walletId: review.wallet_id ?? null,
          externalTransferId: review.external_transfer_id ?? null,
          policyDecisionId: review.policy_decision_id ?? null,
          reviewCaseId: review.review_case_id
        },
        sourceObjectType: sourceType,
        sourceObjectId: sourceId,
        recommendedActions: ["request_more_evidence", "monitor"],
        evidence: (review.raw_evidence ?? {}) as Json,
        redactedEvidence: (review.redacted_evidence ?? {}) as Json,
        sourceEventIds: review.source_event_ids ?? [],
        linkedReviewCaseIds: [review.review_case_id],
        reasonCodes: ["command_center_imported_review_case"],
        metadata: { source: "admin_review_cases" }
      })
    );
  }

  for (const batch of rows.trustFraudReviewBatches as Array<Record<string, unknown>>) {
    const batchId = String(batch.batch_id ?? "");
    if (!batchId) continue;
    if (findAdminCommandItemBySourceDb("trust_fraud_review_batch", batchId)) continue;

    const sev = coerceCommandSeverity(batch.severity as string | null);
    created.push(
      await createAdminCommandItem({
        itemType: "trust_fraud_finding",
        queueScope: "risk",
        severity: sev,
        priority: severityToPriority(sev),
        title: "Trust/fraud review findings",
        summary: "Trust/fraud review batch requires attention.",
        linkedObjectIds: {
          trustFraudBatchId: batchId
        },
        sourceObjectType: "trust_fraud_review_batch",
        sourceObjectId: batchId,
        recommendedActions: normalizeRecommendedActions(batch.recommended_actions),
        evidence: {
          batchId,
          findings: batch.findings,
          breakdown: batch.breakdown
        } as Json,
        redactedEvidence: {
          batchId,
          findingCount: batch.finding_count,
          criticalFindingCount: batch.critical_finding_count
        } as Json,
        sourceEventIds: (batch.source_event_ids as string[] | undefined) ?? [],
        reasonCodes: ["command_center_imported_trust_fraud_batch"],
        metadata: { source: "trust_fraud_review_batches" }
      })
    );
  }

  return {
    createdCount: created.length,
    created
  };
}
