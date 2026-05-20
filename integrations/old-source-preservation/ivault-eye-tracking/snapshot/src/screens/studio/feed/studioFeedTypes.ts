/**
 * [ i ] Studio Stage 5 — runtime feed + creator/viewer loop types (local simulation).
 */

import type { PostPackage } from "../publish/studioPublishTypes";

export type RuntimePostStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "paused"
  | "archived"
  | "deleted"
  | "blocked"
  | "under_review";

export type RuntimeViewerAction =
  | "view"
  | "verified_view"
  | "like"
  | "comment"
  | "save"
  | "share"
  | "follow"
  | "tip"
  | "magic_tap"
  | "magic_unlock"
  | "report"
  | "hide"
  | "age_gate_passed"
  | "disclosure_opened";

export interface RuntimePostMetric {
  impressions: number;
  views: number;
  verifiedViews: number;
  completionRate: number;
  averageWatchMs: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  follows: number;
  tips: number;
  magicTaps: number;
  magicUnlocks: number;
  unlockConversionRate: number;
  creatorGrossEarned: number;
  creatorPendingEarned: number;
  platformFees: number;
  viewerRewardsPaid: number;
  reports: number;
  blocks: number;
}

export function emptyRuntimePostMetrics(): RuntimePostMetric {
  return {
    impressions: 0,
    views: 0,
    verifiedViews: 0,
    completionRate: 0,
    averageWatchMs: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
    follows: 0,
    tips: 0,
    magicTaps: 0,
    magicUnlocks: 0,
    unlockConversionRate: 0,
    creatorGrossEarned: 0,
    creatorPendingEarned: 0,
    platformFees: 0,
    viewerRewardsPaid: 0,
    reports: 0,
    blocks: 0,
  };
}

export interface RuntimePost {
  id: string;
  packageId: string;
  creatorUserId: string;
  creatorHandle: string;
  creatorName: string;
  creatorAvatarUrl?: string;
  status: RuntimePostStatus;
  visibility: PostPackage["visibility"];
  ageRating: PostPackage["ageRating"];
  caption: string;
  hashtags: string[];
  disclosures: PostPackage["disclosures"];
  postPackage: PostPackage;
  metrics: RuntimePostMetric;
  createdAt: string;
  publishedAt?: string;
  updatedAt: string;
  /** Sponsored / campaign rewarded — viewer may earn mock reward */
  viewerRewardEligible?: boolean;
  viewerRewardLabel?: string;
}

export interface RuntimeViewerSession {
  id: string;
  viewerAccountId: string;
  postId: string;
  startedAt: string;
  endedAt?: string;
  watchMs: number;
  attentionScore: number;
  verified: boolean;
  actions: RuntimeViewerAction[];
  unlockIds: string[];
  ageGatePassed: boolean;
  disclosureAcknowledged: boolean;
  impressionCounted: boolean;
  flagged?: boolean;
  /** Stage 7 — mock campaign / objective proofs (no real GPS/QR hardware). */
  locationMatch?: boolean;
  qrScanned?: boolean;
}

export interface RuntimePostActionEvent {
  id: string;
  postId: string;
  viewerAccountId: string;
  action: RuntimeViewerAction;
  revealId?: string;
  unlockId?: string;
  value?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type CreatorDashboardTimeRange = "today" | "seven_days" | "thirty_days" | "all_time";

export interface CreatorPostDashboardState {
  selectedPostId: string | null;
  timeRange: CreatorDashboardTimeRange;
  selectedMetric: keyof RuntimePostMetric | "attention_score";
  selectedRevealId?: string;
}

export type RuntimeUnlockSheetState =
  | { open: false }
  | { open: true; postId: string; revealId: string; blockedReason?: string };
