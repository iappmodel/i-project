import type { PopsMetricTags } from "./pops-metrics";

export type PopsPipelineFinalState =
  | "completed"
  | "closed"
  | "abandoned"
  | "degraded"
  | "failed"
  | "pending_review";

export type PopsRewardDecisionLogValue =
  | "approved_full"
  | "approved_partial"
  | "pending_review"
  | "held"
  | "denied";

export type PopsFraudRiskBucket = "low" | "medium" | "high" | "critical";

export interface PopsPipelineRunLog {
  sessionId: string;
  userId: string;
  campaignId: string | null;
  proofLevel: string;
  finalState: PopsPipelineFinalState;
  rewardDecision: PopsRewardDecisionLogValue;
  fraudRiskBucket: PopsFraudRiskBucket;
  reasonCodes: string[];
  pipelineDurationMs: number;
  errors: string[];
  tags?: PopsMetricTags;
  timestampMs: number;
}

const BLOCKED_FIELD_KEYWORDS = [
  "rawcamera",
  "camera_frame",
  "rawaudio",
  "audio_chunk",
  "precise_location",
  "face_embedding",
  "biometric",
  "private_content",
];

function normalizeForDetection(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toInternalHash(userId: string): string {
  let hash = 2166136261;
  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  const stableHash = (hash >>> 0).toString(16).padStart(8, "0");
  return `uid_${stableHash}`;
}

export function sanitizeUserIdForPopsLog(userId: string, useInternalOnly = false): string {
  if (useInternalOnly) {
    return "internal_only";
  }
  return toInternalHash(userId);
}

export function fraudRiskToBucket(fraudRisk: number): PopsFraudRiskBucket {
  if (!Number.isFinite(fraudRisk)) return "critical";
  if (fraudRisk >= 0.85) return "critical";
  if (fraudRisk >= 0.6) return "high";
  if (fraudRisk >= 0.3) return "medium";
  return "low";
}

function assertNoBlockedFields(payload: Record<string, unknown>): void {
  for (const key of Object.keys(payload)) {
    const normalized = normalizeForDetection(key);
    for (const blocked of BLOCKED_FIELD_KEYWORDS) {
      if (normalized.includes(blocked)) {
        throw new Error(`P.O.P.S logger blocked sensitive field: ${key}`);
      }
    }
  }
}

export interface PopsLogger {
  log(entry: PopsPipelineRunLog): void;
  getEntries(): readonly PopsPipelineRunLog[];
}

export class InMemoryPopsLogger implements PopsLogger {
  private readonly entries: PopsPipelineRunLog[] = [];

  log(entry: PopsPipelineRunLog): void {
    assertNoBlockedFields(entry as unknown as Record<string, unknown>);
    this.entries.push(entry);
  }

  getEntries(): readonly PopsPipelineRunLog[] {
    return this.entries;
  }
}
