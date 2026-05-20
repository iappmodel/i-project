import type {
  IdentityProofLevel,
  ReputationProfile,
  ReputationSignalInput,
  ReputationVerificationResult
} from "../../types/alphabet/reputation.types";
import { verifyReputationProfile } from "./reputation-engine";

type ReputationProfileStoreState = {
  profiles: Map<string, ReputationProfile>;
  profileIdsByUserId: Map<string, string>;
  verificationResults: Map<string, ReputationVerificationResult>;
};

const store: ReputationProfileStoreState = {
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

export function createReputationProfile(params: {
  userId: string;
  identityProofLevel: IdentityProofLevel;
  ageBand: string;
}): ReputationProfile {
  const existingProfileId = store.profileIdsByUserId.get(params.userId);

  if (existingProfileId) {
    const existing = store.profiles.get(existingProfileId);
    if (existing) return existing;
  }

  const now = nowIso();

  const profile: ReputationProfile = {
    reputationProfileId: createId("reputation_profile"),
    userId: params.userId,
    identityProofLevel: params.identityProofLevel,
    identityStrengthScore: 0,
    reputationScore: 0,
    credibilityScore: 0,
    riskScore: 0,
    status: "created",
    ageBand: params.ageBand,
    createdAt: now,
    updatedAt: now
  };

  store.profiles.set(profile.reputationProfileId, profile);
  store.profileIdsByUserId.set(profile.userId, profile.reputationProfileId);

  return profile;
}

export function getReputationProfile(
  reputationProfileId: string
): ReputationProfile | null {
  return store.profiles.get(reputationProfileId) ?? null;
}

export function getReputationProfileByUserId(
  userId: string
): ReputationProfile | null {
  const id = store.profileIdsByUserId.get(userId);
  if (!id) return null;

  return store.profiles.get(id) ?? null;
}

export function updateIdentityProofLevel(params: {
  userId: string;
  identityProofLevel: IdentityProofLevel;
}): ReputationProfile {
  const profile = getReputationProfileByUserId(params.userId);

  if (!profile) {
    throw new Error("Reputation profile not found.");
  }

  const next: ReputationProfile = {
    ...profile,
    identityProofLevel: params.identityProofLevel,
    updatedAt: nowIso()
  };

  store.profiles.set(next.reputationProfileId, next);

  return next;
}

export function verifyStoredReputationProfile(
  input: Omit<
    ReputationSignalInput,
    "reputationProfileId" | "userId" | "identityProofLevel" | "ageBand"
  > & {
    userId: string;
  }
): ReputationVerificationResult {
  const profile = getReputationProfileByUserId(input.userId);

  if (!profile) {
    throw new Error("Reputation profile not found.");
  }

  const result = verifyReputationProfile({
    ...input,
    reputationProfileId: profile.reputationProfileId,
    userId: profile.userId,
    identityProofLevel: profile.identityProofLevel,
    ageBand: profile.ageBand,
    metadata: {
      ...input.metadata
    }
  });

  const nextStatus: ReputationProfile["status"] =
    result.status === "reputation_verified"
      ? "reputation_verified"
      : result.status === "identity_strengthened"
        ? "identity_strengthened"
        : result.status === "credible_profile"
          ? "credible"
          : result.status === "emerging_profile"
            ? "emerging"
            : result.status === "needs_review"
              ? "needs_review"
              : result.status === "restricted"
                ? "restricted"
                : "suspicious";

  const next: ReputationProfile = {
    ...profile,
    identityStrengthScore: result.identityStrengthScore,
    reputationScore: result.reputationScore,
    credibilityScore: result.credibilityScore,
    riskScore: result.riskScore,
    status: nextStatus,
    updatedAt: nowIso()
  };

  store.profiles.set(next.reputationProfileId, next);
  store.verificationResults.set(result.reputationProfileId, result);

  return result;
}

export function getReputationVerificationResult(
  reputationProfileId: string
): ReputationVerificationResult | null {
  return store.verificationResults.get(reputationProfileId) ?? null;
}

export function resetReputationProfileStoreForTests(): void {
  store.profiles.clear();
  store.profileIdsByUserId.clear();
  store.verificationResults.clear();
}
