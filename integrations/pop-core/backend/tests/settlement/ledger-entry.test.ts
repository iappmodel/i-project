import { describe, expect, it } from "vitest";
import {
  LEDGER_BOUNDARY_V1,
  buildLedgerCreditEntryFromReleaseExecution,
  deriveLedgerEntryId
} from "../../settlement/ledger-entry.js";
import { RELEASE_EXECUTION_BOUNDARY_V1 } from "../../settlement/release-execution.js";
import { SETTLEMENT_CURRENCY_V1 } from "../../settlement/settlement-amount.constants.js";
import { buildReleaseExecutionRecordFixture } from "./release-execution-store.contract.js";

describe("deriveLedgerEntryId", () => {
  it("derives deterministic ledgerEntryId from executionRef", () => {
    const executionRef = "release_sess_abc_100_SETTLEMENT_AMOUNT_POLICY_V1";

    expect(deriveLedgerEntryId(executionRef)).toBe(`ledger_credit_${executionRef}`);
    expect(deriveLedgerEntryId(executionRef)).toBe(deriveLedgerEntryId(executionRef));
  });
});

describe("buildLedgerCreditEntryFromReleaseExecution", () => {
  it("maps fields from ReleaseExecutionRecord with boundaryVersion LEDGER_BOUNDARY_V1", () => {
    const execution = buildReleaseExecutionRecordFixture({ sessionId: "sess_ledger_entry", amount: 100 });

    const entry = buildLedgerCreditEntryFromReleaseExecution(execution);

    expect(entry.boundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    expect(entry.ledgerEntryId).toBe(deriveLedgerEntryId(execution.executionRef));
    expect(entry.sourceRef).toBe(execution.executionRef);
    expect(entry.sessionId).toBe(execution.sessionId);
    expect(entry.offerId).toBe(execution.offerId);
    expect(entry.direction).toBe("credit");
    expect(entry.entryType).toBe("hold_release_credit");
    expect(entry.amount).toBe(execution.amount);
    expect(entry.currency).toBe(SETTLEMENT_CURRENCY_V1);
    expect(entry.amountBreakdown).toEqual(execution.amountBreakdown);
    expect(entry.status).toBe("pending_wallet_credit");
    expect(entry.sourceExecutedAt).toBe(execution.executedAt);
    expect(entry.postedAt).toBe(execution.executedAt);
  });

  it("shallow-copies amountBreakdown", () => {
    const execution = buildReleaseExecutionRecordFixture();
    const entry = buildLedgerCreditEntryFromReleaseExecution(execution);

    expect(entry.amountBreakdown).toEqual(execution.amountBreakdown);
    expect(entry.amountBreakdown).not.toBe(execution.amountBreakdown);
  });

  it("uses postedAt override when provided", () => {
    const execution = buildReleaseExecutionRecordFixture();
    const postedAt = "2026-05-23T13:00:00.000Z";

    const entry = buildLedgerCreditEntryFromReleaseExecution(execution, { postedAt });

    expect(entry.postedAt).toBe(postedAt);
    expect(entry.sourceExecutedAt).toBe(execution.executedAt);
  });

  it("rejects wrong boundaryVersion", () => {
    const execution = buildReleaseExecutionRecordFixture();
    const invalid = { ...execution, boundaryVersion: "INVALID" as typeof RELEASE_EXECUTION_BOUNDARY_V1 };

    expect(() => buildLedgerCreditEntryFromReleaseExecution(invalid)).toThrow(
      `buildLedgerCreditEntryFromReleaseExecution requires boundaryVersion ${RELEASE_EXECUTION_BOUNDARY_V1}`
    );
  });

  it("rejects non-released releaseStatus", () => {
    const execution = buildReleaseExecutionRecordFixture();
    const invalid = { ...execution, releaseStatus: "not_released" as "released" };

    expect(() => buildLedgerCreditEntryFromReleaseExecution(invalid)).toThrow(
      'buildLedgerCreditEntryFromReleaseExecution requires releaseStatus "released"'
    );
  });

  it("rejects empty executionRef", () => {
    const execution = buildReleaseExecutionRecordFixture();
    const invalid = { ...execution, executionRef: "  " };

    expect(() => buildLedgerCreditEntryFromReleaseExecution(invalid)).toThrow(
      "buildLedgerCreditEntryFromReleaseExecution requires a non-empty executionRef"
    );
  });

  it("rejects amount < 1", () => {
    const execution = buildReleaseExecutionRecordFixture();
    const invalid = { ...execution, amount: 0 };

    expect(() => buildLedgerCreditEntryFromReleaseExecution(invalid)).toThrow(
      "buildLedgerCreditEntryFromReleaseExecution requires amount >= 1"
    );
  });
});
