import { describe, expect, it } from "vitest";
import { runScheduledJobHandler } from "../scheduled-job-registry";
import type { ScheduledJobKey } from "@/types/alphabet/scheduled-job.types";

describe("scheduled-job-registry", () => {
  it("returns failure for unknown job key", async () => {
    const result = await runScheduledJobHandler("unknown_job" as ScheduledJobKey);

    expect(result.ok).toBe(false);
    expect(result.reasonCodes).toContain("scheduled_job_unknown_key");
  });
});
