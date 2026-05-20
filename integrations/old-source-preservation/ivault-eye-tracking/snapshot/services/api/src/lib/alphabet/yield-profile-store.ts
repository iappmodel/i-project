import type {
  YieldGrantTier,
  YieldProfile,
  YieldSignalInput,
  YieldVerificationResult
} from "../../types/alphabet/yield.types";
import { verifyYieldProfile } from "./yield-engine";

type YieldProfileStoreState = {
  profiles: Map<string, YieldProfile>;
  profileIdsByUserId: Map<string, string>;
  verificationResults: Map<string, YieldVerificationResult>;
};

const store: YieldProfileStoreState = {
  profiles: new Map(),
  profileIdsByUserId: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createYieldProfile(params: {
  userId: string;
  ageBand: string;
}): YieldProfile {
  const existingProfileId = store.profileIdsByUserId.get(params.userId);

  if (existingProfileId) {
    const existing = store.profiles.get(existingProfileId);
    if (existing) return existing;
  }

  const now = nowIso();

  const profile: YieldProfile = {
    yieldProfileId: createId("yield_profile"),
    userId: params.userId,
    yieldScore: 0,
    grantEligibilityScore: 0,
    moralWeightScore: 0,
    riskScore: 0,
    grantTier: "none",
    status: "created",
    lastGrantAt: null,
    lastEvaluatedAt: null,
    ageBand: params.ageBand,
    createdAt: now,
    updatedAt: now
  };

  store.profiles.set(profile.yieldProfileId, profile);
  store.profileIdsByUserId.set(profile.userId, profile.yieldProfileId);

  return profile;
}

export function getYieldProfile(yieldProfileId: string): YieldProfile | null {
  return store.profiles.get(yieldProfileId) ?? null;
}

export function getYieldProfileByUserId(userId: string): YieldProfile | null {
  const id = store.profileIdsByUserId.get(userId);
  if (!id) return null;

  return store.profiles.get(id) ?? null;
}

function mapResultStatusToProfileStatus(
  status: YieldVerificationResult["status"]
): YieldProfile["status"] {
  switch (status) {
    case "yield_accrued":
      return "accruing";
    case "grant_eligible":
      return "grant_eligible";
    case "rare_grant_candidate":
      return "rare_candidate";
    case "cooling_down":
      return "cooling_down";
    case "needs_review":
      return "needs_review";
    case "suspicious":
      return "suspicious";
    case "disqualified":
      return "disqualified";
    case "not_yet_eligible":
    default:
      return "accruing";
  }
}

export function verifyStoredYieldProfile(
  input: Omit<
    YieldSignalInput,
    | "yieldProfileId"
    | "userId"
    | "ageBand"
    | "priorGrantCount"
    | "daysSinceLastGrant"
  > & {
    userId: string;
    priorGrantCount?: number;
    daysSinceLastGrant?: number | null;
  }
): YieldVerificationResult {
  const profile = getYieldProfileByUserId(input.userId);

  if (!profile) {
    throw new Error("Yield profile not found.");
  }

  const result = verifyYieldProfile({
    ...input,
    yieldProfileId: profile.yieldProfileId,
    userId: profile.userId,
    ageBand: profile.ageBand,
    priorGrantCount: input.priorGrantCount ?? 0,
    daysSinceLastGrant: input.daysSinceLastGrant ?? null,
    metadata: {
      ...input.metadata
    }
  });

  const grantTier: YieldGrantTier = result.grantTier;

  const next: YieldProfile = {
    ...profile,
    yieldScore: result.yieldScore,
    grantEligibilityScore: result.grantEligibilityScore,
    moralWeightScore: result.moralWeightScore,
    riskScore: result.riskScore,
    grantTier,
    status: mapResultStatusToProfileStatus(result.status),
    lastGrantAt:
      result.valueGrantAwardedEvent !== null && result.valueGrantAwardedEvent !== undefined
        ? nowIso()
        : profile.lastGrantAt,
    lastEvaluatedAt: nowIso(),
    updatedAt: nowIso()
  };

  store.profiles.set(next.yieldProfileId, next);
  store.verificationResults.set(result.yieldProfileId, result);

  return result;
}

export function getYieldVerificationResult(
  yieldProfileId: string
): YieldVerificationResult | null {
  return store.verificationResults.get(yieldProfileId) ?? null;
}

export function resetYieldProfileStoreForTests(): void {
  store.profiles.clear();
  store.profileIdsByUserId.clear();
  store.verificationResults.clear();
}
