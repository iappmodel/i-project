import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import {
  PendingHoldConflictError,
  type PendingHoldStore
} from "../pending-hold-store.js";
import type { PendingHoldRecord } from "../pending-hold.js";
import {
  fromStoredRecord,
  PendingHoldRecordStorageError,
  toStoredRecord
} from "./pending-hold-record-serializer.js";

export interface JsonFilePendingHoldStoreOptions {
  baseDir: string;
}

export class PendingHoldInvalidSessionIdError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Pending hold sessionId is not filesystem-safe: ${sessionId}`);
    this.name = "PendingHoldInvalidSessionIdError";
    this.sessionId = sessionId;
  }
}

export class PendingHoldStoreReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PendingHoldStoreReadError";
  }
}

const SAFE_SESSION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function assertFilesystemSafeSessionId(sessionId: string): void {
  if (sessionId.length === 0) {
    throw new PendingHoldInvalidSessionIdError(sessionId);
  }

  if (sessionId === "." || sessionId === "..") {
    throw new PendingHoldInvalidSessionIdError(sessionId);
  }

  if (sessionId.includes("/") || sessionId.includes("\\") || sessionId.includes("\0")) {
    throw new PendingHoldInvalidSessionIdError(sessionId);
  }

  if (sessionId.includes("..")) {
    throw new PendingHoldInvalidSessionIdError(sessionId);
  }

  if (!SAFE_SESSION_ID_PATTERN.test(sessionId)) {
    throw new PendingHoldInvalidSessionIdError(sessionId);
  }
}

function writeJsonAtomically(finalPath: string, payload: unknown): void {
  const tmpPath = `${finalPath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(tmpPath, finalPath);
}

export class JsonFilePendingHoldStore implements PendingHoldStore {
  private readonly recordsDir: string;

  constructor(options: JsonFilePendingHoldStoreOptions) {
    this.recordsDir = join(options.baseDir, "records");
    mkdirSync(this.recordsDir, { recursive: true });
  }

  save(record: PendingHoldRecord): PendingHoldRecord {
    assertFilesystemSafeSessionId(record.sessionId);

    const recordPath = join(this.recordsDir, `${record.sessionId}.json`);
    if (existsSync(recordPath)) {
      throw new PendingHoldConflictError(record.sessionId);
    }

    const stored = toStoredRecord(record);
    writeJsonAtomically(recordPath, stored);

    return record;
  }

  getBySessionId(sessionId: string): PendingHoldRecord | null {
    assertFilesystemSafeSessionId(sessionId);

    const recordPath = join(this.recordsDir, `${sessionId}.json`);
    if (!existsSync(recordPath)) {
      return null;
    }

    return this.readRecordFile(recordPath);
  }

  private readRecordFile(recordPath: string): PendingHoldRecord {
    try {
      const parsed = JSON.parse(readFileSync(recordPath, "utf8")) as unknown;
      return fromStoredRecord(parsed);
    } catch (error) {
      if (error instanceof PendingHoldRecordStorageError) {
        throw new PendingHoldStoreReadError(
          `Failed to deserialize record at ${recordPath}: ${error.message}`
        );
      }

      throw new PendingHoldStoreReadError(`Failed to read record at ${recordPath}`);
    }
  }
}
