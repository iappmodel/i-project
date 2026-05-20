import { describe, expect, it } from "vitest";
import {
  inferQueueScope,
  normalizeRecommendedActions,
  severityToPriority,
  uniqueStrings
} from "../admin-command-center-normalizers";

describe("admin-command-center-normalizers", () => {
  it("maps critical severity to urgent priority", () => {
    expect(severityToPriority("critical")).toBe("urgent");
  });

  it("infers wallet scope", () => {
    expect(
      inferQueueScope({
        itemType: "wallet_invariant_failure"
      })
    ).toBe("wallet");
  });

  it("infers payout scope", () => {
    expect(
      inferQueueScope({
        sourceObjectType: "external_transfer"
      })
    ).toBe("payout");
  });

  it("normalizes recommended actions", () => {
    expect(normalizeRecommendedActions(["monitor", "freeze_wallet_review"])).toEqual([
      "monitor",
      "freeze_wallet_review"
    ]);
  });

  it("deduplicates strings", () => {
    expect(uniqueStrings(["a", "a", "b", null])).toEqual(["a", "b"]);
  });
});
