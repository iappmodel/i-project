import {
  acquireScheduledJobLockDb,
  getScheduledJobLockDb,
  releaseScheduledJobLockDb
} from "../db-repositories/scheduled-jobs.repository";
import type { Json } from "@/types/alphabet/database.types";

export function buildScheduledJobLockKey(jobKey: string): string {
  return `scheduled-job:${jobKey}`;
}

export async function inspectScheduledJobLock(jobKey: string) {
  const lockKey = buildScheduledJobLockKey(jobKey);
  const lock = await getScheduledJobLockDb(lockKey);

  const now = Date.now();
  const lockExpired = lock ? new Date(String(lock.lock_expires_at)).getTime() <= now : false;

  return {
    lockKey,
    lock,
    lockExists: Boolean(lock),
    lockExpired
  };
}

export async function acquireScheduledJobLock(params: {
  jobKey: string;
  lockedBy: string;
  lockTtlSeconds: number;
  metadata?: Record<string, unknown>;
}): Promise<Record<string, unknown> | null> {
  const lockKey = buildScheduledJobLockKey(params.jobKey);

  return acquireScheduledJobLockDb({
    jobKey: params.jobKey,
    lockKey,
    lockedBy: params.lockedBy,
    lockTtlSeconds: params.lockTtlSeconds,
    metadata: (params.metadata ?? {}) as Json
  });
}

export async function releaseScheduledJobLock(jobKey: string) {
  return releaseScheduledJobLockDb(buildScheduledJobLockKey(jobKey));
}
