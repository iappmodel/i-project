/**
 * [ i ] Studio Stage 4 — publish pipeline, safety gate, post package, runtime.
 * Wire names for analytics: `studioEvents.ts`.
 */

import type { MagicReveal } from "../studioTypes";

export type PublishTarget =
  | "i_feed"
  | "i_story"
  | "i_campaign"
  | "private_link"
  | "subscriber_only"
  | "draft_only"
  | "download_only"
  | "external_platform";

export type PublishStatus =
  | "idle"
  | "validating"
  | "blocked"
  | "ready"
  | "exporting"
  | "exported"
  | "publishing"
  | "published"
  | "failed";

export type PostVisibility =
  | "public"
  | "followers"
  | "subscribers"
  | "private"
  | "unlisted"
  | "campaign_only";

export type PostAgeRating =
  | "everyone"
  | "teen"
  | "sixteen_plus"
  | "eighteen_plus"
  | "twentyone_plus"
  | "restricted";

export type PostMonetizationMode =
  | "none"
  | "tips_enabled"
  | "magic_unlocks"
  | "sponsor_funded"
  | "paid_post"
  | "subscriber_only"
  | "campaign_rewarded";

export type PublishBlockSeverity = "info" | "warning" | "blocking";

export type PublishCheckStatus = "pending" | "passed" | "warning" | "failed" | "blocked";

export type PublishCheckCategory =
  | "media"
  | "safety"
  | "rights"
  | "magic"
  | "wallet"
  | "age"
  | "disclosure"
  | "export";

export interface PublishCheck {
  id: string;
  label: string;
  description: string;
  status: PublishCheckStatus;
  severity: PublishBlockSeverity;
  blocking: boolean;
  category: PublishCheckCategory;
  reason?: string;
  fixAction?: string;
}

export type StudioPublishSafetyReportStatus = "pending" | "passed" | "warning" | "blocked";

export interface StudioSafetyReport {
  id: string;
  projectId: string;
  status: StudioPublishSafetyReportStatus;
  checks: PublishCheck[];
  ageRating: PostAgeRating;
  detectedIssues: DetectedSafetyIssue[];
  blockedReasons: string[];
  monetizationAllowed: boolean;
  requiresHumanReview: boolean;
  createdAt: string;
}

export type DetectedSafetyIssueType =
  | "nudity"
  | "sexual_content"
  | "violence"
  | "self_harm"
  | "drugs"
  | "weapons"
  | "hate"
  | "personal_information"
  | "minor_face"
  | "financial_information"
  | "medical_information"
  | "copyrighted_content"
  | "impersonation"
  | "deepfake_risk"
  | "location_risk"
  | "scam_risk";

export type DetectedSafetyIssueSeverity = "info" | "warning" | "blocking";

export type DetectedSafetyRequiredAction =
  | "none"
  | "warning"
  | "blur_required"
  | "age_gate_required"
  | "monetization_disabled"
  | "human_review"
  | "publish_blocked";

export interface DetectedSafetyIssue {
  id: string;
  type: DetectedSafetyIssueType;
  severity: DetectedSafetyIssueSeverity;
  timelineStartMs?: number;
  timelineEndMs?: number;
  relatedRevealId?: string;
  message: string;
  requiredAction: DetectedSafetyRequiredAction;
}

export type StudioRightsReportStatus = "pending" | "cleared" | "warning" | "blocked";

export type OwnershipStatus =
  | "owned"
  | "imported_self"
  | "imported_external"
  | "licensed"
  | "unlicensed"
  | "unknown";

export interface StudioRightsReport {
  id: string;
  projectId: string;
  status: StudioRightsReportStatus;
  ownershipStatus: OwnershipStatus;
  musicRightsStatus: string;
  commercialUseAllowed: boolean;
  monetizationAllowed: boolean;
  attributionRequired: boolean;
  blockedAssets: string[];
  warnings: string[];
  exportBlocked?: boolean;
  createdAt: string;
}

export interface PostDisclosure {
  id: string;
  type:
    | "sponsored"
    | "paid_unlock"
    | "affiliate"
    | "ai_edited"
    | "beauty_edited"
    | "age_restricted"
    | "viewer_rewarded"
    | "creator_earns"
    | "imported_media";
  label: string;
  required: boolean;
  visibleToViewer: boolean;
  message: string;
  /** Local UI: user acknowledged a required disclosure row (publish flow). */
  requirementAccepted?: boolean;
}

export interface ExportManifest {
  renderId: string;
  outputUrl: string;
  thumbnailUrl: string;
  durationMs: number;
  width: number;
  height: number;
  aspectRatio: string;
  quality: string;
  includesWatermark: boolean;
  includesBurnedCaptions: boolean;
  includesMagicMaskMap: boolean;
  createdAt: string;
}

export interface PostRuntimeConfig {
  allowMagicUnlocks: boolean;
  allowTips: boolean;
  allowComments: boolean;
  allowShares: boolean;
  allowSaves: boolean;
  allowDuetRemix: boolean;
  showWalletChip: boolean;
  showCreatorRevenueDisclosure: boolean;
  showViewerRewardDisclosure: boolean;
  requireAgeGateBeforeView: boolean;
  requireHumanVerificationForUnlocks: boolean;
}

export interface PostPackage {
  id: string;
  sourceProjectId: string;
  creatorUserId: string;
  title: string;
  caption: string;
  hashtags: string[];
  visibility: PostVisibility;
  ageRating: PostAgeRating;
  publishTarget: PublishTarget;
  monetizationMode: PostMonetizationMode;
  media: { assetIds: string[]; primaryAssetId?: string };
  timeline: { clipIds: string[]; durationMs: number };
  magicReveals: MagicReveal[];
  unlockRules: Record<string, unknown>;
  walletRules: Record<string, unknown>;
  safetyReport: StudioSafetyReport;
  rightsReport: StudioRightsReport;
  disclosures: PostDisclosure[];
  exportManifest: ExportManifest;
  runtimeConfig: PostRuntimeConfig;
  createdAt: string;
}

export type PublishedPostStatus = "live" | "scheduled" | "removed" | "draft_feed";

export interface PublishedPost {
  id: string;
  packageId: string;
  creatorUserId: string;
  status: PublishedPostStatus;
  visibility: PostVisibility;
  publishedAt: string;
  postPackage: PostPackage;
}

/** Mock wallet / settlement surface for publish validation (no real payments). */
export interface PublishWalletState {
  creatorAccountExists: boolean;
  platformFeeBpsConfigured: boolean;
  rewardPoolExists: boolean;
  settlementRulesExist: boolean;
  viewerRewardsEnabled: boolean;
}

export interface PublishValidationOptions {
  /** Simulated: rights block export */
  rightsBlockExport?: boolean;
  /** Simulated: unlicensed music */
  unlicensedMusicMock?: boolean;
}

export interface PublishValidationResult {
  checks: PublishCheck[];
  canExport: boolean;
  canPublish: boolean;
  blockedReasons: string[];
  warnings: string[];
}

export interface PostRuntimeViewerAccount {
  id: string;
  age?: number;
  trustScore: number;
  isVerifiedHuman: boolean;
  isFollower: boolean;
  isSubscriber: boolean;
  walletBalances: Record<string, number>;
}

export interface PostRuntimeUnlockState {
  unlockedRevealIds: Set<string> | string[];
}

export interface PostRuntimeStateResult {
  visibleReveals: MagicReveal[];
  lockedReveals: MagicReveal[];
  unlockedReveals: MagicReveal[];
  blockedReveals: MagicReveal[];
  ageGateRequired: boolean;
  walletChipVisible: boolean;
  disclosuresToShow: PostDisclosure[];
}

export interface RuntimeTapResolution {
  shouldOpenUnlockSheet: boolean;
  alreadyUnlocked: boolean;
  blockedReason?: string;
  requiredAction?: string;
}
