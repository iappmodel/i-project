import { describe, expect, it } from "vitest";
import { InMemoryReleaseExecutionStore } from "../../settlement/release-execution-store.js";
import {
  buildReleaseExecutionRecordFixture,
  runReleaseExecutionStoreContract
} from "./release-execution-store.contract.js";

describe("InMemoryReleaseExecutionStore", () => {
  runReleaseExecutionStoreContract("InMemoryReleaseExecutionStore", () => new InMemoryReleaseExecutionStore());

  it("clear removes all records", () => {
    const store = new InMemoryReleaseExecutionStore();
    const record = buildReleaseExecutionRecordFixture();
    store.save(record);
    store.clear();
    expect(store.getBySessionId(record.sessionId)).toBeNull();
  });
});
