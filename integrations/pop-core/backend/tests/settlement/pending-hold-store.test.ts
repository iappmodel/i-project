import { describe, expect, it } from "vitest";
import { InMemoryPendingHoldStore } from "../../settlement/pending-hold-store.js";
import {
  buildPendingHoldRecord,
  runPendingHoldStoreContract
} from "./pending-hold-store.contract.js";

runPendingHoldStoreContract("InMemoryPendingHoldStore", () => new InMemoryPendingHoldStore());

describe("InMemoryPendingHoldStore", () => {
  it("clears all records", () => {
    const store = new InMemoryPendingHoldStore();
    const record = buildPendingHoldRecord();

    store.save(record);
    store.clear();

    expect(store.getBySessionId(record.sessionId)).toBeNull();
  });
});
