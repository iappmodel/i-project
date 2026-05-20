import { PrivacyViolationError } from "./errors";
import { DataClass, PrivacyPurpose, RetentionPolicy } from "./types";
import { PrivacyEventContract, PrivacyEventType } from "./events";

type JsonRecord = Record<string, unknown>;

export interface PrivacyAuditWriter {
  writeAuditEvent(event: PrivacyEventContract): Promise<void>;
}

const BLOCKED_FIELDS = new Set([
  "camera_frame",
  "frame_data",
  "image_blob",
  "face_mesh_raw",
  "gaze_vector_raw",
  "pupil_raw",
  "expression_raw",
  "gps_trace_raw",
  "touch_trace_raw",
  "biometric_raw",
]);

const ALLOWED_DERIVED_FIELDS = new Set([
  "attention_confidence",
  "fraud_score",
  "verification_result",
  "reward_amount",
  "campaign_id",
  "device_attestation_hash",
]);

function walkObject(value: unknown, path: string[] = [], acc: string[] = []): string[] {
  if (!value || typeof value !== "object") {
    return acc;
  }
  for (const [key, nested] of Object.entries(value as JsonRecord)) {
    const nextPath = [...path, key];
    if (BLOCKED_FIELDS.has(key)) {
      acc.push(nextPath.join("."));
    }
    walkObject(nested, nextPath, acc);
  }
  return acc;
}

function includesRawData(payload: JsonRecord): boolean {
  const rawDataIncluded = payload.raw_data_included;
  return rawDataIncluded === true;
}

export async function assertPrivacySafePayload(
  payload: JsonRecord,
  context: {
    eventId: string;
    userId: string;
    actor: string;
    purpose: PrivacyPurpose;
    auditWriter: PrivacyAuditWriter;
  },
): Promise<void> {
  const blockedFieldPaths = walkObject(payload).filter((path) => {
    const fieldName = path.split(".").pop() ?? path;
    return !ALLOWED_DERIVED_FIELDS.has(fieldName);
  });
  const hasRawDataFlag = includesRawData(payload);

  if (!blockedFieldPaths.length && !hasRawDataFlag) {
    return;
  }

  await context.auditWriter.writeAuditEvent({
    event_id: context.eventId,
    user_id: context.userId,
    event_type: PrivacyEventType.RetentionPolicyApplied,
    data_class: DataClass.EphemeralHumanSignal,
    purpose: context.purpose,
    created_at: new Date().toISOString(),
    retention_policy: RetentionPolicy.ImmediateDelete,
    raw_data_included: false,
    actor: context.actor,
    metadata: {
      blocked_field_paths: blockedFieldPaths,
      blocked_reason: hasRawDataFlag
        ? "raw_data_included flag must never be true on persisted payloads"
        : "blocked sensitive raw signal field detected",
    },
  });

  if (hasRawDataFlag) {
    throw new PrivacyViolationError(
      "Persisted payload cannot set raw_data_included=true.",
      ["raw_data_included"],
    );
  }

  throw new PrivacyViolationError(
    `Persisted payload includes restricted raw signal fields: ${blockedFieldPaths.join(", ")}`,
    blockedFieldPaths,
  );
}
