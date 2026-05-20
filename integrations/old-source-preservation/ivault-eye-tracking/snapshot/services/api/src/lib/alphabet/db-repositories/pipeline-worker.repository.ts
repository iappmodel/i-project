import { createServiceDbClient } from "../db-client";

export async function updatePipelineStepByExecutionDb(params: {
  executionRequestId: string;
  stepName: string;
  status: string;
  reasonCodes?: string[];
}) {
  const db = createServiceDbClient();

  const { data: pipelines, error: readError } = await db
    .from("pipeline_records")
    .select("*")
    .contains("execution_request_ids", [params.executionRequestId]);

  if (readError) throw readError;

  for (const pipeline of pipelines ?? []) {
    const steps = Array.isArray(pipeline.steps) ? pipeline.steps : [];

    const nextSteps = steps.map((step: Record<string, unknown>) => {
      if (step.stepName !== params.stepName) return step;

      return {
        ...step,
        status: params.status,
        reasonCodes: params.reasonCodes ?? step.reasonCodes ?? []
      };
    });

    const { error: writeError } = await db
      .from("pipeline_records")
      .update({
        steps: nextSteps,
        updated_at: new Date().toISOString()
      })
      .eq("pipeline_id", pipeline.pipeline_id);

    if (writeError) throw writeError;
  }

  return pipelines;
}

export async function updatePipelineStatusByExecutionDb(params: {
  executionRequestId: string;
  status: string;
}) {
  const db = createServiceDbClient();

  const { data: pipelines, error: readError } = await db
    .from("pipeline_records")
    .select("*")
    .contains("execution_request_ids", [params.executionRequestId]);

  if (readError) throw readError;

  for (const pipeline of pipelines ?? []) {
    const { error: writeError } = await db
      .from("pipeline_records")
      .update({
        status: params.status,
        completed_at:
          params.status === "pipeline_completed"
            ? new Date().toISOString()
            : pipeline.completed_at,
        failed_at: params.status === "pipeline_failed" ? new Date().toISOString() : pipeline.failed_at,
        updated_at: new Date().toISOString()
      })
      .eq("pipeline_id", pipeline.pipeline_id);

    if (writeError) throw writeError;
  }

  return pipelines;
}
