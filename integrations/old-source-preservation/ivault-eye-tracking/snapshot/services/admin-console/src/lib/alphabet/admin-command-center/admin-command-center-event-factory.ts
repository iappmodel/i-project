import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type { AdminCommandDecisionInput, AdminCommandItemInput } from "@/types/alphabet/admin-command-center.types";
import { buildAlphabetEventForAdminCommandDecision } from "./admin-command-center-engine";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** AlphabetEvent envelope when a new command queue item is created (ingest or manual). */
export function buildAdminCommandItemCreatedEvent(params: {
  commandItemId: string;
  input: AdminCommandItemInput;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.linkedObjectIds.userId ?? "00000000-0000-0000-0000-000000000001",
    coinCode: "J",
    eventType: "admin_command_item_created",
    objectType: "admin_command_item",
    objectId: params.commandItemId,
    sourceContext: "admin_command_center",
    rawScore: 1,
    qualityScore: 1,
    trustScoreAtEvent: null,
    riskScore:
      params.input.severity === "critical" ? 0.9 : params.input.severity === "danger" ? 0.65 : 0.25,
    ageBand: "unknown",
    verificationStatus: "verified",
    metadata: {
      itemType: params.input.itemType,
      queueScope: params.input.queueScope,
      severity: params.input.severity,
      priority: params.input.priority,
      sourceObjectType: params.input.sourceObjectType,
      sourceObjectId: params.input.sourceObjectId
    },
    createdAt: new Date().toISOString()
  };
}

export function buildAdminCommandDecisionAlphabetEvent(
  input: AdminCommandDecisionInput
): AlphabetEvent {
  return buildAlphabetEventForAdminCommandDecision(input);
}
