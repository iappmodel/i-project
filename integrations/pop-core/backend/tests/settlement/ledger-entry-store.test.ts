import { describe, expect, it } from "vitest";
import { InMemoryLedgerEntryStore } from "../../settlement/ledger-entry-store.js";
import {
  buildLedgerEntryFixture,
  runLedgerEntryStoreContract
} from "./ledger-entry-store.contract.js";

runLedgerEntryStoreContract("InMemoryLedgerEntryStore", () => new InMemoryLedgerEntryStore());

describe("InMemoryLedgerEntryStore", () => {
  it("clears stored records", () => {
    const store = new InMemoryLedgerEntryStore();
    const entry = buildLedgerEntryFixture();

    store.save(entry);
    store.clear();

    expect(store.getBySourceRef(entry.sourceRef)).toBeNull();
    expect(store.getBySessionId(entry.sessionId)).toBeNull();
  });
});
