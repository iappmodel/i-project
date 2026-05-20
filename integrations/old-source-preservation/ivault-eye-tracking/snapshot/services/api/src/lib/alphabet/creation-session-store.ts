import type {
  CreationArtifact,
  CreationArtifactType,
  CreationSignalInput,
  CreationVerificationResult
} from "../../types/alphabet/creation.types";
import { verifyCreationArtifact } from "./creation-engine";

type CreationStoreState = {
  artifacts: Map<string, CreationArtifact>;
  verificationResults: Map<string, CreationVerificationResult>;
};

const store: CreationStoreState = {
  artifacts: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function submitCreationArtifact(params: {
  userId: string;
  creatorId: string;
  artifactType: CreationArtifactType;
  ageBand: string;
  title?: string | null;
  description?: string | null;
  aiAssisted: boolean;
  aiDisclosed: boolean;
}): CreationArtifact {
  const now = nowIso();

  const artifact: CreationArtifact = {
    artifactId: createId("creation_artifact"),
    userId: params.userId,
    creatorId: params.creatorId,
    artifactType: params.artifactType,
    title: params.title ?? null,
    description: params.description ?? null,
    aiAssisted: params.aiAssisted,
    aiDisclosed: params.aiDisclosed,
    status: "submitted",
    ageBand: params.ageBand,
    submittedAt: now,
    updatedAt: now
  };

  store.artifacts.set(artifact.artifactId, artifact);

  return artifact;
}

export function getCreationArtifact(artifactId: string): CreationArtifact | null {
  return store.artifacts.get(artifactId) ?? null;
}

export function verifyStoredCreationArtifact(
  input: Omit<
    CreationSignalInput,
    | "artifactId"
    | "userId"
    | "creatorId"
    | "artifactType"
    | "aiAssisted"
    | "aiDisclosed"
    | "ageBand"
  > & {
    artifactId: string;
  }
): CreationVerificationResult {
  const artifact = getCreationArtifact(input.artifactId);

  if (!artifact) {
    throw new Error("Creation artifact not found.");
  }

  const result = verifyCreationArtifact({
    ...input,
    artifactId: artifact.artifactId,
    userId: artifact.userId,
    creatorId: artifact.creatorId,
    artifactType: artifact.artifactType,
    aiAssisted: artifact.aiAssisted,
    aiDisclosed: artifact.aiDisclosed,
    ageBand: artifact.ageBand,
    metadata: {
      ...input.metadata,
      title: artifact.title,
      description: artifact.description
    }
  });

  const nextStatus: CreationArtifact["status"] =
    result.status === "quality_verified" ||
    result.status === "originality_verified" ||
    result.status === "creation_verified"
      ? "verified"
      : result.status === "needs_review"
        ? "needs_review"
        : result.status === "suspicious"
          ? "suspicious"
          : "rejected";

  const next: CreationArtifact = {
    ...artifact,
    status: nextStatus,
    updatedAt: nowIso()
  };

  store.artifacts.set(next.artifactId, next);
  store.verificationResults.set(result.artifactId, result);

  return result;
}

export function getCreationVerificationResult(
  artifactId: string
): CreationVerificationResult | null {
  return store.verificationResults.get(artifactId) ?? null;
}

export function resetCreationStoreForTests(): void {
  store.artifacts.clear();
  store.verificationResults.clear();
}
