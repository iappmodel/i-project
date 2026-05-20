import type { WorkerLockResult } from "@/types/alphabet/worker-runtime.types";
import { claimNextExecutionRequestDb } from "../db-repositories/execution-worker.repository";

export async function lockNextExecutionRequest(params: {
  workerId: string;
  targetSystem?: string | null;
}): Promise<WorkerLockResult> {
  const executionRequest = await claimNextExecutionRequestDb({
    workerId: params.workerId,
    targetSystem: params.targetSystem ?? null
  });

  if (!executionRequest) {
    return {
      locked: false,
      executionRequest: null,
      reasonCodes: ["worker_no_execution_request_available"]
    };
  }

  return {
    locked: true,
    executionRequest,
    reasonCodes: ["worker_execution_request_locked"]
  };
}
