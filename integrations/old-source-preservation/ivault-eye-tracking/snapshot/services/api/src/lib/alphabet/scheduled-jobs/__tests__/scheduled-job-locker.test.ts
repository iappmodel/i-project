import { describe, expect, it } from "vitest";
import { buildScheduledJobLockKey } from "../scheduled-job-locker";

describe("scheduled-job-locker", () => {
  it("builds deterministic lock key", () => {
    expect(buildScheduledJobLockKey("provider_polling_5m")).toBe(
      "scheduled-job:provider_polling_5m"
    );
  });
});
