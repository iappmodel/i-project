import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonFilePendingHoldStore,
  PendingHoldInvalidSessionIdError,
  PendingHoldStoreReadError
} from "../../settlement/persistence/json-file-pending-hold-store.js";
import { toStoredRecord } from "../../settlement/persistence/pending-hold-record-serializer.js";
import {
  buildPartialProofReviewRecord,
  buildPendingHoldRecord,
  createHoldFromReviewRecord,
  runPendingHoldStoreContract
} from "./pending-hold-store.contract.js";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "pending-hold-store-"));
  tempDirs.push(dir);
  return dir;
}

function createStore(baseDir?: string): JsonFilePendingHoldStore {
  return new JsonFilePendingHoldStore({ baseDir: baseDir ?? createTempDir() });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

runPendingHoldStoreContract("JsonFilePendingHoldStore", () => createStore());

describe("JsonFilePendingHoldStore durability", () => {
  it("reloads records from disk via a new store instance", () => {
    const baseDir = createTempDir();
    const record = buildPendingHoldRecord({
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });

    createStore(baseDir).save(record);

    const reloaded = createStore(baseDir).getBySessionId(record.sessionId);
    expect(reloaded).toEqual(record);
  });

  it("writes one JSON record per sessionId under records/", () => {
    const baseDir = createTempDir();
    const record = buildPendingHoldRecord({ sessionId: "sess-file-layout" });

    createStore(baseDir).save(record);

    const recordPath = join(baseDir, "records", "sess-file-layout.json");

    expect(existsSync(recordPath)).toBe(true);
    expect(JSON.parse(readFileSync(recordPath, "utf8"))).toMatchObject({
      storageVersion: 1,
      sessionId: "sess-file-layout",
      amount: 100,
      releaseStatus: "not_released",
      amountBreakdown: record.amountBreakdown
    });
  });

  it("reloads partial hold amount and breakdown from disk", () => {
    const baseDir = createTempDir();
    const partialRecord = buildPartialProofReviewRecord();
    const result = createHoldFromReviewRecord(partialRecord, {
      store: createStore(baseDir),
      createdAt: "2026-05-23T12:01:00.000Z"
    });

    expect(result.outcome).toBe("created");

    const reloaded = createStore(baseDir).getBySessionId(partialRecord.sessionId);
    expect(reloaded?.amount).toBe(50);
    expect(reloaded?.amountBreakdown?.computedAmountMinor).toBe(50);
    expect(reloaded?.releaseStatus).toBe("not_released");
  });

  it("does not serve partial records when only a temp file exists", () => {
    const baseDir = createTempDir();
    const record = buildPendingHoldRecord({ sessionId: "sess-interrupted" });
    const recordPath = join(baseDir, "records", "sess-interrupted.json");
    const tmpPath = `${recordPath}.tmp`;

    mkdirSync(join(baseDir, "records"), { recursive: true });
    writeFileSync(tmpPath, JSON.stringify(toStoredRecord(record), null, 2), "utf8");

    expect(existsSync(recordPath)).toBe(false);
    expect(createStore(baseDir).getBySessionId("sess-interrupted")).toBeNull();
  });

  it("rejects unsafe sessionId values for save and lookup", () => {
    const store = createStore();
    const record = buildPendingHoldRecord({ sessionId: "../escape" });

    expect(() => store.save(record)).toThrow(PendingHoldInvalidSessionIdError);
    expect(() => store.getBySessionId("../escape")).toThrow(PendingHoldInvalidSessionIdError);
  });

  it("corrupted amount mismatch fails load", () => {
    const baseDir = createTempDir();
    const record = buildPendingHoldRecord({ sessionId: "sess-corrupted-amount" });
    const recordPath = join(baseDir, "records", "sess-corrupted-amount.json");
    const corrupted = toStoredRecord(record);

    mkdirSync(join(baseDir, "records"), { recursive: true });
    writeFileSync(
      recordPath,
      JSON.stringify(
        {
          ...corrupted,
          amount: 100,
          amountBreakdown: {
            ...corrupted.amountBreakdown,
            computedAmountMinor: 50
          }
        },
        null,
        2
      ),
      "utf8"
    );

    expect(() => createStore(baseDir).getBySessionId("sess-corrupted-amount")).toThrow(
      PendingHoldStoreReadError
    );
  });
});
