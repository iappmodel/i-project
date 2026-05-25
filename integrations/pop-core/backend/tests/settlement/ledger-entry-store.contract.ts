import { describe, expect, it } from "vitest";
import {
  LEDGER_BOUNDARY_V1,
  buildLedgerCreditEntryFromReleaseExecution
} from "../../settlement/ledger-entry.js";
import {
  LedgerEntryConflictError,
  type LedgerEntryStore
} from "../../settlement/ledger-entry-store.js";
import { buildReleaseExecutionRecordFixture } from "./release-execution-store.contract.js";

export function buildLedgerEntryFixture(
  overrides: {
    sessionId?: string;
    amount?: number;
  } = {}
) {
  const execution = buildReleaseExecutionRecordFixture(overrides);
  return buildLedgerCreditEntryFromReleaseExecution(execution);
}

export function runLedgerEntryStoreContract(
  name: string,
  createStore: () => LedgerEntryStore
): void {
  describe(name, () => {
    it("saves and retrieves a record by sourceRef", () => {
      const store = createStore();
      const entry = buildLedgerEntryFixture();

      expect(store.save(entry)).toBe(entry);
      expect(store.getBySourceRef(entry.sourceRef)).toEqual(entry);
    });

    it("retrieves a record by sessionId", () => {
      const store = createStore();
      const entry = buildLedgerEntryFixture();

      store.save(entry);

      expect(store.getBySessionId(entry.sessionId)).toEqual(entry);
    });

    it("throws LedgerEntryConflictError for duplicate sourceRef", () => {
      const store = createStore();
      const entry = buildLedgerEntryFixture();

      store.save(entry);

      expect(() => store.save(entry)).toThrow(LedgerEntryConflictError);
      expect(() => store.save(entry)).toThrow(
        `Ledger entry already exists for sourceRef: ${entry.sourceRef}`
      );
    });

    it("returns null for missing sourceRef", () => {
      const store = createStore();
      store.save(buildLedgerEntryFixture());

      expect(store.getBySourceRef("missing-source-ref")).toBeNull();
    });

    it("returns null for missing sessionId", () => {
      const store = createStore();
      store.save(buildLedgerEntryFixture());

      expect(store.getBySessionId("missing-session")).toBeNull();
    });

    it("persists boundaryVersion on saved records", () => {
      const store = createStore();
      const entry = buildLedgerEntryFixture();

      store.save(entry);

      expect(store.getBySourceRef(entry.sourceRef)?.boundaryVersion).toBe(LEDGER_BOUNDARY_V1);
    });
  });
}
