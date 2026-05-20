import { describe, expect, it } from "vitest";
import { evaluateScheduledJob } from "../scheduled-job-engine";
import type { ScheduledJobSignalInput } from "@/types/alphabet/scheduled-job.types";

function scores() {
  return {
    jobReadinessScore: 0.95,
    lockSafetyScore: 0.95,
    executionSafetyScore: 0.95,
    resultIntegrityScore: 0.9,
    retrySafetyScore: 0.8
  };
}

function makeInput(overrides: Partial<ScheduledJobSignalInput> = {}): ScheduledJobSignalInput {
  return {
    jobKey: "provider_polling_5m",
    jobCategory: "payments",
    active: true,
    currentStatus: "job_created",
    triggerSource: "cron",
    triggeredByUserId: null,
    lockExists: false,
    lockExpired: false,
    lockKey: "scheduled-job:provider_polling_5m",
    lockedBy: "test",
    attempt: 1,
    retryLimit: 2,
    maxRuntimeSeconds: 240,
    lockTtlSeconds: 300,
    previousFailureCount: 0,
    safetyScores: scores(),
    now: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

describe("scheduled-job-engine", () => {
  it("allows job run when active and unlocked", () => {
    const result = evaluateScheduledJob(makeInput());

    expect(result.status).toBe("job_run_allowed");
    expect(result.shouldRun).toBe(true);
  });

  it("skips when active lock exists", () => {
    const result = evaluateScheduledJob(
      makeInput({
        lockExists: true,
        lockExpired: false
      })
    );

    expect(result.status).toBe("job_skip_locked");
    expect(result.shouldSkip).toBe(true);
  });

  it("allows when lock exists but expired", () => {
    const result = evaluateScheduledJob(
      makeInput({
        lockExists: true,
        lockExpired: true
      })
    );

    expect(result.status).toBe("job_run_allowed");
  });

  it("blocks inactive job", () => {
    const result = evaluateScheduledJob(
      makeInput({
        active: false
      })
    );

    expect(result.status).toBe("job_run_blocked");
  });

  it("dead letters failed job beyond retry limit", () => {
    const result = evaluateScheduledJob(
      makeInput({
        currentStatus: "job_failed",
        attempt: 3,
        retryLimit: 2
      })
    );

    expect(result.status).toBe("job_dead_letter");
  });
});
