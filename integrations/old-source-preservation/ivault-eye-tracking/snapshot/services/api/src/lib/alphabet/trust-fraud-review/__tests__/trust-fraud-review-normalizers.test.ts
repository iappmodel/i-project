import { describe, expect, it } from "vitest";
import {
  dateRangeForTrustFraudBatchDate,
  groupBy,
  isFailureStatus,
  isMoneyObject,
  normalizeRiskScore,
  uniqueCount
} from "../trust-fraud-review-normalizers";

describe("trust-fraud-review-normalizers", () => {
  it("builds UTC date range", () => {
    const range = dateRangeForTrustFraudBatchDate("2026-04-27");

    expect(range.periodStart).toBe("2026-04-27T00:00:00.000Z");
    expect(range.periodEnd).toBe("2026-04-28T00:00:00.000Z");
  });

  it("groups rows by key", () => {
    const grouped = groupBy(
      [{ user_id: "u1" }, { user_id: "u1" }, { user_id: "u2" }],
      "user_id"
    );

    expect(grouped.u1).toHaveLength(2);
    expect(grouped.u2).toHaveLength(1);
  });

  it("detects failure statuses", () => {
    expect(isFailureStatus("review_failed")).toBe(true);
    expect(isFailureStatus("completed")).toBe(false);
  });

  it("detects money objects", () => {
    expect(isMoneyObject("wallet_account")).toBe(true);
    expect(isMoneyObject("comment")).toBe(false);
  });

  it("normalizes percent risk scores", () => {
    expect(normalizeRiskScore(85)).toBe(0.85);
    expect(normalizeRiskScore(0.85)).toBe(0.85);
  });

  it("counts unique values", () => {
    expect(uniqueCount(["a", "a", "b", null])).toBe(2);
  });
});
