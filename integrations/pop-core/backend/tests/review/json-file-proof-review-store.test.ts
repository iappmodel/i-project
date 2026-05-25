import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  JsonFileProofReviewStore,
  ProofReviewInvalidSessionIdError
} from "../../review/persistence/json-file-proof-review-store.js";
import { toStoredRecord } from "../../review/persistence/proof-review-record-serializer.js";
import {
  buildProofReviewRecord,
  runProofReviewStoreContract
} from "./proof-review-store.contract.js";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "proof-review-store-"));
  tempDirs.push(dir);
  return dir;
}

function createStore(baseDir?: string): JsonFileProofReviewStore {
  return new JsonFileProofReviewStore({ baseDir: baseDir ?? createTempDir() });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

runProofReviewStoreContract("JsonFileProofReviewStore", () => createStore());

describe("JsonFileProofReviewStore durability", () => {
  it("reloads records from disk via a new store instance", () => {
    const baseDir = createTempDir();
    const record = buildProofReviewRecord({
      artifactId: "PP-000001",
      packetId: "pkt-test-001"
    });

    createStore(baseDir).save(record);

    const reloaded = createStore(baseDir).getBySessionId(record.sessionId);
    expect(reloaded).toEqual(record);
    expect(createStore(baseDir).getByArtifactId("PP-000001")).toEqual(record);
    expect(createStore(baseDir).getByPacketId("pkt-test-001")).toEqual(record);
  });

  it("writes one JSON record per sessionId under records/", () => {
    const baseDir = createTempDir();
    const record = buildProofReviewRecord({ sessionId: "sess-file-layout" });

    createStore(baseDir).save(record);

    const recordPath = join(baseDir, "records", "sess-file-layout.json");
    const indexPath = join(baseDir, "_indexes.json");

    expect(existsSync(recordPath)).toBe(true);
    expect(existsSync(indexPath)).toBe(true);
    expect(JSON.parse(readFileSync(recordPath, "utf8"))).toMatchObject({
      storageVersion: 1,
      sessionId: "sess-file-layout",
      lifecycleEvents: record.lifecycleEvents
    });
  });

  it("does not serve partial records when only a temp file exists", () => {
    const baseDir = createTempDir();
    const record = buildProofReviewRecord({ sessionId: "sess-interrupted" });
    const recordPath = join(baseDir, "records", "sess-interrupted.json");
    const tmpPath = `${recordPath}.tmp`;

    mkdirSync(join(baseDir, "records"), { recursive: true });
    writeFileSync(tmpPath, JSON.stringify(toStoredRecord(record), null, 2), "utf8");

    expect(existsSync(recordPath)).toBe(false);
    expect(createStore(baseDir).getBySessionId("sess-interrupted")).toBeNull();
  });

  it("rejects unsafe sessionId values for save and lookup", () => {
    const store = createStore();
    const record = buildProofReviewRecord({ sessionId: "../escape" });

    expect(() => store.save(record)).toThrow(ProofReviewInvalidSessionIdError);
    expect(() => store.getBySessionId("../escape")).toThrow(ProofReviewInvalidSessionIdError);
  });
});
