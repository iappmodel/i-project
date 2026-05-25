import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import {
  ProofReviewConflictError,
  type ProofReviewRecord,
  type ProofReviewStore
} from "../proof-review-store.js";
import {
  fromStoredRecord,
  PROOF_REVIEW_RECORD_STORAGE_VERSION,
  ProofReviewRecordStorageError,
  toStoredRecord
} from "./proof-review-record-serializer.js";

export interface JsonFileProofReviewStoreOptions {
  baseDir: string;
}

interface ProofReviewIndexFileV1 {
  storageVersion: typeof PROOF_REVIEW_RECORD_STORAGE_VERSION;
  artifactId: Record<string, string>;
  packetId: Record<string, string>;
}

export class ProofReviewInvalidSessionIdError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`Proof review sessionId is not filesystem-safe: ${sessionId}`);
    this.name = "ProofReviewInvalidSessionIdError";
    this.sessionId = sessionId;
  }
}

export class ProofReviewStoreReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProofReviewStoreReadError";
  }
}

const SAFE_SESSION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export function assertFilesystemSafeSessionId(sessionId: string): void {
  if (sessionId.length === 0) {
    throw new ProofReviewInvalidSessionIdError(sessionId);
  }

  if (sessionId === "." || sessionId === "..") {
    throw new ProofReviewInvalidSessionIdError(sessionId);
  }

  if (sessionId.includes("/") || sessionId.includes("\\") || sessionId.includes("\0")) {
    throw new ProofReviewInvalidSessionIdError(sessionId);
  }

  if (sessionId.includes("..")) {
    throw new ProofReviewInvalidSessionIdError(sessionId);
  }

  if (!SAFE_SESSION_ID_PATTERN.test(sessionId)) {
    throw new ProofReviewInvalidSessionIdError(sessionId);
  }
}

function emptyIndexFile(): ProofReviewIndexFileV1 {
  return {
    storageVersion: PROOF_REVIEW_RECORD_STORAGE_VERSION,
    artifactId: {},
    packetId: {}
  };
}

function readIndexFile(path: string): ProofReviewIndexFileV1 {
  if (!existsSync(path)) {
    return emptyIndexFile();
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as ProofReviewIndexFileV1).storageVersion !== PROOF_REVIEW_RECORD_STORAGE_VERSION
    ) {
      throw new ProofReviewStoreReadError(`Invalid index file at ${path}`);
    }

    const index = parsed as ProofReviewIndexFileV1;
    return {
      storageVersion: PROOF_REVIEW_RECORD_STORAGE_VERSION,
      artifactId: index.artifactId ?? {},
      packetId: index.packetId ?? {}
    };
  } catch (error) {
    if (error instanceof ProofReviewStoreReadError) {
      throw error;
    }

    throw new ProofReviewStoreReadError(`Failed to read index file at ${path}`);
  }
}

function writeJsonAtomically(finalPath: string, payload: unknown): void {
  const tmpPath = `${finalPath}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(tmpPath, finalPath);
}

export class JsonFileProofReviewStore implements ProofReviewStore {
  private readonly baseDir: string;
  private readonly recordsDir: string;
  private readonly indexPath: string;

  constructor(options: JsonFileProofReviewStoreOptions) {
    this.baseDir = options.baseDir;
    this.recordsDir = join(this.baseDir, "records");
    this.indexPath = join(this.baseDir, "_indexes.json");
    mkdirSync(this.recordsDir, { recursive: true });
  }

  save(record: ProofReviewRecord): ProofReviewRecord {
    assertFilesystemSafeSessionId(record.sessionId);

    const recordPath = join(this.recordsDir, `${record.sessionId}.json`);
    if (existsSync(recordPath)) {
      throw new ProofReviewConflictError(record.sessionId);
    }

    const stored = toStoredRecord(record);
    writeJsonAtomically(recordPath, stored);

    const index = readIndexFile(this.indexPath);
    if (record.artifactId) {
      index.artifactId[record.artifactId] = record.sessionId;
    }
    if (record.packetId) {
      index.packetId[record.packetId] = record.sessionId;
    }
    writeJsonAtomically(this.indexPath, index);

    return record;
  }

  getBySessionId(sessionId: string): ProofReviewRecord | null {
    assertFilesystemSafeSessionId(sessionId);

    const recordPath = join(this.recordsDir, `${sessionId}.json`);
    if (!existsSync(recordPath)) {
      return null;
    }

    return this.readRecordFile(recordPath);
  }

  getByArtifactId(artifactId: string): ProofReviewRecord | null {
    const index = readIndexFile(this.indexPath);
    const sessionId = index.artifactId[artifactId];
    if (!sessionId) {
      return null;
    }

    return this.getBySessionId(sessionId);
  }

  getByPacketId(packetId: string): ProofReviewRecord | null {
    const index = readIndexFile(this.indexPath);
    const sessionId = index.packetId[packetId];
    if (!sessionId) {
      return null;
    }

    return this.getBySessionId(sessionId);
  }

  private readRecordFile(recordPath: string): ProofReviewRecord {
    try {
      const parsed = JSON.parse(readFileSync(recordPath, "utf8")) as unknown;
      return fromStoredRecord(parsed);
    } catch (error) {
      if (error instanceof ProofReviewRecordStorageError) {
        throw new ProofReviewStoreReadError(
          `Failed to deserialize record at ${recordPath}: ${error.message}`
        );
      }

      throw new ProofReviewStoreReadError(`Failed to read record at ${recordPath}`);
    }
  }
}
