import { createServiceDbClient } from "../db-client";
import type { DbNotificationRecord, Json } from "@/types/alphabet/database.types";

export async function insertNotificationRecordDb(params: {
  recipientUserId: string;
  sourceSystem: string;
  sourceObjectId?: string | null;
  sourceEventIds?: string[];
  category: string;
  severity: string;
  status: string;
  title?: string | null;
  body?: string | null;
  explanationClass?: string | null;
  objectLabel?: string | null;
  internalReasonCodes?: string[];
  privacySensitivity?: string;
  dedupeKey?: string | null;
  metadata?: Json;
}): Promise<DbNotificationRecord> {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("notification_records")
    .insert({
      recipient_user_id: params.recipientUserId,
      source_system: params.sourceSystem,
      source_object_id: params.sourceObjectId ?? null,
      source_event_ids: params.sourceEventIds ?? [],
      category: params.category,
      severity: params.severity,
      status: params.status,
      title: params.title ?? null,
      body: params.body ?? null,
      explanation_class: params.explanationClass ?? null,
      object_label: params.objectLabel ?? null,
      internal_reason_codes: params.internalReasonCodes ?? [],
      privacy_sensitivity: params.privacySensitivity ?? "medium",
      dedupe_key: params.dedupeKey ?? null,
      metadata: (params.metadata ?? {}) as Record<string, unknown>
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DbNotificationRecord;
}
