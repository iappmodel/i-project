import type { PopsProofLevel, PopsSessionType } from "../../../pops/capture/pops-client-events";

export type FeedCardKind = "organic" | "sponsored" | "creator_paid_action";
export type FeedIntentAction = "like" | "save" | "follow" | "share" | "cta_click";
export type FeedPopsProofLevel =
  | "LEVEL_0_NONE"
  | "LEVEL_1_SESSION"
  | "LEVEL_2_ATTENTION"
  | "LEVEL_3_INTENT";

export type FeedPopsCampaignRules = {
  id?: string;
  rewardMinor?: number;
  rewardCurrency?: "ICOIN" | "VCOIN" | "RCOIN" | "USD";
  proofLevel?: FeedPopsProofLevel;
  requiredDurationMs?: number;
  requiredProgressPct?: number;
  allowsMutedPlayback?: boolean;
  allowsBackgroundPlaybackWithAudio?: boolean;
  minVisibleMsBeforeProgress?: number;
  minVisibleMsBeforeSessionStart?: number;
  repeatWindowMs?: number;
  continuityWindowMs?: number;
};

export type FeedPopsResolvedRules = {
  sessionType: PopsSessionType;
  feedProofLevel: FeedPopsProofLevel;
  popsProofLevel: PopsProofLevel;
  requiredDurationMs: number;
  requiredProgressPct: number;
  rewardMinor: number;
  rewardCurrency: "ICOIN" | "VCOIN" | "RCOIN" | "USD";
  allowsMutedPlayback: boolean;
  allowsBackgroundPlaybackWithAudio: boolean;
  minVisibleMsBeforeProgress: number;
  minVisibleMsBeforeSessionStart: number;
  repeatWindowMs: number;
  continuityWindowMs: number;
};

export const FEED_POPS_DEFAULTS = {
  checkpointMs: 5_000,
  requiredDurationMs: 25_000,
  requiredProgressPct: 85,
  rewardMinor: 25,
  rewardCurrency: "ICOIN" as const,
  minVisibleMsBeforeProgress: 1_500,
  minVisibleMsBeforeSessionStart: 900,
  repeatWindowMs: 20 * 60_000,
  continuityWindowMs: 15_000,
};

export function resolveFeedPopsRules(
  kind: FeedCardKind,
  campaignRules?: FeedPopsCampaignRules,
): FeedPopsResolvedRules {
  const feedProofLevel = resolveFeedProofLevel(kind, campaignRules?.proofLevel);
  return {
    sessionType: kind === "organic" ? "STANDARD" : "REWARD",
    feedProofLevel,
    popsProofLevel: toPopsProofLevel(feedProofLevel),
    requiredDurationMs: campaignRules?.requiredDurationMs ?? FEED_POPS_DEFAULTS.requiredDurationMs,
    requiredProgressPct: campaignRules?.requiredProgressPct ?? FEED_POPS_DEFAULTS.requiredProgressPct,
    rewardMinor: campaignRules?.rewardMinor ?? FEED_POPS_DEFAULTS.rewardMinor,
    rewardCurrency: campaignRules?.rewardCurrency ?? FEED_POPS_DEFAULTS.rewardCurrency,
    allowsMutedPlayback: campaignRules?.allowsMutedPlayback ?? true,
    allowsBackgroundPlaybackWithAudio: campaignRules?.allowsBackgroundPlaybackWithAudio ?? false,
    minVisibleMsBeforeProgress:
      campaignRules?.minVisibleMsBeforeProgress ?? FEED_POPS_DEFAULTS.minVisibleMsBeforeProgress,
    minVisibleMsBeforeSessionStart:
      campaignRules?.minVisibleMsBeforeSessionStart ?? FEED_POPS_DEFAULTS.minVisibleMsBeforeSessionStart,
    repeatWindowMs: campaignRules?.repeatWindowMs ?? FEED_POPS_DEFAULTS.repeatWindowMs,
    continuityWindowMs: campaignRules?.continuityWindowMs ?? FEED_POPS_DEFAULTS.continuityWindowMs,
  };
}

export function canStartPopsForVisibility(params: {
  visibleMs: number;
  minVisibleMsBeforeSessionStart: number;
  scrollVelocityPxPerSec?: number;
}): boolean {
  if (params.visibleMs < params.minVisibleMsBeforeSessionStart) return false;
  if (params.scrollVelocityPxPerSec !== undefined && params.scrollVelocityPxPerSec > 2200) return false;
  return true;
}

export function canAccrueProgress(params: {
  visibleMs: number;
  isForeground: boolean;
  isScreenActive: boolean;
  isAudioForegroundAllowed: boolean;
  isMuted: boolean;
  allowsMutedPlayback: boolean;
  allowsBackgroundPlaybackWithAudio: boolean;
  minVisibleMsBeforeProgress: number;
}): boolean {
  if (params.visibleMs < params.minVisibleMsBeforeProgress) return false;
  if (!params.isScreenActive) return false;
  if (!params.allowsMutedPlayback && params.isMuted) return false;
  if (!params.isForeground && !params.allowsBackgroundPlaybackWithAudio) return false;
  if (!params.isForeground && params.allowsBackgroundPlaybackWithAudio && !params.isAudioForegroundAllowed) return false;
  return true;
}

export function computeRewardUiProgress(params: {
  contentCompletionPct: number;
  verificationConfidenceProgressPct: number;
  requiredDurationProgressPct: number;
}): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.min(
        params.contentCompletionPct,
        params.verificationConfidenceProgressPct,
        params.requiredDurationProgressPct,
      ),
    ),
  );
}

function resolveFeedProofLevel(kind: FeedCardKind, requested?: FeedPopsProofLevel): FeedPopsProofLevel {
  if (requested) return requested;
  if (kind === "organic") return "LEVEL_1_SESSION";
  if (kind === "sponsored") return "LEVEL_2_ATTENTION";
  return "LEVEL_2_ATTENTION";
}

export function toPopsProofLevel(feedProofLevel: FeedPopsProofLevel): PopsProofLevel {
  return feedProofLevel === "LEVEL_0_NONE" || feedProofLevel === "LEVEL_1_SESSION" ? "BASIC" : "ATTENTION";
}
