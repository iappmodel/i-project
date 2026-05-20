import { createServiceDbClient } from "../db-client";

export async function updateSagaStepBySourceObjectDb(params: {
  sourceObjectId: string;
  status: string;
  metadata?: Record<string, unknown>;
}) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("saga_steps")
    .update({
      status: params.status,
      completed_at: params.status === "passed" ? new Date().toISOString() : null,
      failed_at: params.status === "failed" ? new Date().toISOString() : null,
      metadata: params.metadata ?? {},
      updated_at: new Date().toISOString()
    })
    .eq("source_object_id", params.sourceObjectId)
    .select("*");

  if (error) throw error;
  return data;
}

export async function updateSagaStatusDb(params: { sagaId: string; status: string }) {
  const db = createServiceDbClient();

  const { data, error } = await db
    .from("saga_records")
    .update({
      status: params.status,
      updated_at: new Date().toISOString(),
      completed_at: params.status === "saga_completed" ? new Date().toISOString() : null,
      failed_at: params.status === "saga_failed" ? new Date().toISOString() : null
    })
    .eq("saga_id", params.sagaId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}
