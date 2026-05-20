import { describe, expect, it } from "vitest";
import {
  isMoneyTarget,
  ledgerDebitAmount,
  secondsBetween,
  sumDebits
} from "../stuck-saga-normalizers";

describe("stuck-saga-normalizers", () => {
  it("calculates seconds between timestamps", () => {
    expect(
      secondsBetween("2026-04-27T00:00:00.000Z", "2026-04-27T00:01:00.000Z")
    ).toBe(60);
  });

  it("detects money targets", () => {
    expect(isMoneyTarget("withdrawal")).toBe(true);
    expect(isMoneyTarget("wallet")).toBe(true);
    expect(isMoneyTarget("notification")).toBe(false);
  });

  it("extracts debit amount", () => {
    expect(ledgerDebitAmount({ direction: "debit", amount: 25 })).toBe(25);
    expect(ledgerDebitAmount({ direction: "credit", amount: 25 })).toBe(0);
  });

  it("sums debit amounts", () => {
    expect(
      sumDebits([
        { direction: "debit", amount: 10 },
        { direction: "credit", amount: 50 },
        { direction: "debit", amount: 5 }
      ])
    ).toBe(15);
  });
});
