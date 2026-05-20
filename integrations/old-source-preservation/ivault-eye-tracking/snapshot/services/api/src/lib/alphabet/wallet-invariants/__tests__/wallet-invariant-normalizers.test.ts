import { describe, expect, it } from "vitest";
import {
  computeBalancesFromLedgers,
  computeValueLotTotal,
  ledgerSignedAmount
} from "../wallet-invariant-normalizers";

describe("wallet-invariant-normalizers", () => {
  it("converts credit ledger to positive amount", () => {
    expect(ledgerSignedAmount({ direction: "credit", amount: 10 })).toBe(10);
  });

  it("converts debit ledger to negative amount", () => {
    expect(ledgerSignedAmount({ direction: "debit", amount: 10 })).toBe(-10);
  });

  it("computes available balance from posted ledgers using delta columns", () => {
    const result = computeBalancesFromLedgers([
      {
        ledger_status: "posted",
        available_delta: 20,
        pending_delta: 0,
        locked_delta: 0
      },
      {
        ledger_status: "posted",
        available_delta: -5,
        pending_delta: 0,
        locked_delta: 0
      }
    ]);

    expect(result.computedAvailableBalance).toBe(15);
    expect(result.computedTotalBalance).toBe(15);
  });

  it("computes active value lot total", () => {
    const total = computeValueLotTotal([
      {
        amount: 10,
        status: "active"
      },
      {
        amount: 5,
        status: "expired"
      }
    ]);

    expect(total).toBe(10);
  });
});
