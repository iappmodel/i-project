import type {
  WorkSignalInput,
  WorkTask,
  WorkTaskContext,
  WorkVerificationResult
} from "../../types/alphabet/work.types";
import { verifyWorkTask } from "./work-engine";

type WorkTaskStoreState = {
  tasks: Map<string, WorkTask>;
  verificationResults: Map<string, WorkVerificationResult>;
};

const store: WorkTaskStoreState = {
  tasks: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createWorkTask(params: {
  workerUserId: string;
  clientUserId?: string | null;
  businessId?: string | null;
  context: WorkTaskContext;
  taskValue: number;
  workerAgeBand: string;
  objectType?: string | null;
  objectId?: string | null;
}): WorkTask {
  if (params.taskValue < 0) {
    throw new Error("taskValue cannot be negative.");
  }

  const now = nowIso();

  const task: WorkTask = {
    workTaskId: createId("work_task"),
    workerUserId: params.workerUserId,
    clientUserId: params.clientUserId ?? null,
    businessId: params.businessId ?? null,
    context: params.context,
    objectType: params.objectType ?? null,
    objectId: params.objectId ?? null,
    taskValue: params.taskValue,
    status: "created",
    workerAgeBand: params.workerAgeBand,
    createdAt: now,
    acceptedAt: null,
    deliveredAt: null,
    verifiedAt: null,
    updatedAt: now
  };

  store.tasks.set(task.workTaskId, task);

  return task;
}

export function getWorkTask(workTaskId: string): WorkTask | null {
  return store.tasks.get(workTaskId) ?? null;
}

export function acceptWorkTask(workTaskId: string): WorkTask {
  const task = getWorkTask(workTaskId);

  if (!task) {
    throw new Error("Work task not found.");
  }

  if (task.status !== "created") {
    throw new Error(`Cannot accept work task in status: ${task.status}.`);
  }

  const now = nowIso();

  const next: WorkTask = {
    ...task,
    status: "accepted",
    acceptedAt: now,
    updatedAt: now
  };

  store.tasks.set(next.workTaskId, next);

  return next;
}

export function markWorkDelivered(workTaskId: string): WorkTask {
  const task = getWorkTask(workTaskId);

  if (!task) {
    throw new Error("Work task not found.");
  }

  if (task.status !== "accepted" && task.status !== "created") {
    throw new Error(`Cannot mark delivered in status: ${task.status}.`);
  }

  const now = nowIso();

  const next: WorkTask = {
    ...task,
    status: "delivered",
    deliveredAt: now,
    updatedAt: now
  };

  store.tasks.set(next.workTaskId, next);

  return next;
}

export function verifyStoredWorkTask(
  input: Omit<
    WorkSignalInput,
    | "workTaskId"
    | "workerUserId"
    | "clientUserId"
    | "businessId"
    | "context"
    | "taskValue"
    | "workerAgeBand"
  > & {
    workTaskId: string;
  }
): WorkVerificationResult {
  const task = getWorkTask(input.workTaskId);

  if (!task) {
    throw new Error("Work task not found.");
  }

  const result = verifyWorkTask({
    ...input,
    workTaskId: task.workTaskId,
    workerUserId: task.workerUserId,
    clientUserId: task.clientUserId,
    businessId: task.businessId,
    context: task.context,
    taskValue: task.taskValue,
    workerAgeBand: task.workerAgeBand,
    metadata: {
      ...input.metadata,
      objectType: task.objectType,
      objectId: task.objectId
    }
  });

  const nextStatus: WorkTask["status"] =
    result.status === "exchange_verified"
      ? "exchange_verified"
      : result.status === "work_verified"
        ? "verified"
        : result.status === "completed_needs_review"
          ? "needs_review"
          : result.status === "disputed"
            ? "disputed"
            : result.status === "suspicious"
              ? "suspicious"
              : "rejected";

  const now = nowIso();

  const next: WorkTask = {
    ...task,
    status: nextStatus,
    verifiedAt:
      nextStatus === "verified" || nextStatus === "exchange_verified"
        ? now
        : task.verifiedAt,
    updatedAt: now
  };

  store.tasks.set(next.workTaskId, next);
  store.verificationResults.set(result.workTaskId, result);

  return result;
}

export function getWorkVerificationResult(
  workTaskId: string
): WorkVerificationResult | null {
  return store.verificationResults.get(workTaskId) ?? null;
}

export function resetWorkTaskStoreForTests(): void {
  store.tasks.clear();
  store.verificationResults.clear();
}
