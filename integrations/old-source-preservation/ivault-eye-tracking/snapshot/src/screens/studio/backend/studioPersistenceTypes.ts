/**
 * [ i ] Studio Stage 8 — persistent row shapes (separate from UI store models).
 */

import type {
  AssetId,
  CampaignId,
  ClipId,
  DisputeId,
  EventId,
  LedgerEntryId,
  MagicRevealId,
  PostId,
  ProjectId,
  TrackId,
  UserId,
  VerificationRecordId,
  WalletAccountId,
} from "./studioApiTypes";

export interface PersistentStudioProject {
  id: ProjectId;
  ownerUserId: UserId;
  title: string;
  status: string;
  draftPayload: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PersistentStudioAsset {
  id: AssetId;
  projectId: ProjectId;
  ownerUserId: UserId;
  uri?: string;
  status: string;
  payload: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PersistentStudioTrack {
  id: TrackId;
  projectId: ProjectId;
  version: number;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentStudioClip {
  id: ClipId;
  projectId: ProjectId;
  trackId: TrackId;
  version: number;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentMagicReveal {
  id: MagicRevealId;
  projectId: ProjectId;
  ownerUserId: UserId;
  status: string;
  payload: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PersistentExportJob {
  id: string;
  projectId: ProjectId;
  ownerUserId: UserId;
  label: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentPostPackage {
  id: string;
  projectId: ProjectId;
  exportJobId: string;
  ownerUserId: UserId;
  /** Immutable snapshot after publish / seal. */
  packagePayload: Record<string, unknown>;
  contentHash?: string;
  sealedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentPublishedPost {
  id: PostId;
  packageId: string;
  creatorUserId: UserId;
  status: string;
  postPackageSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentCampaign {
  id: CampaignId;
  projectId: ProjectId;
  ownerUserId: UserId;
  status: string;
  monetization: Record<string, unknown>;
  monetizationMode: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentCampaignActionAttempt {
  id: string;
  campaignId: CampaignId;
  projectId: ProjectId;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentWalletAccount {
  id: WalletAccountId;
  ownerUserId: UserId;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Append-only ledger line — never UPDATE in production; reverse via compensating entry. */
export interface PersistentLedgerEntry {
  id: LedgerEntryId;
  walletAccountId?: WalletAccountId;
  projectId?: ProjectId;
  postId?: PostId;
  status: "pending" | "completed" | "reversed";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PersistentVerificationRecord {
  id: VerificationRecordId;
  projectId?: ProjectId;
  postId?: PostId;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface PersistentFraudAssessment {
  id: string;
  verificationId?: VerificationRecordId;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PersistentPOPSChallenge {
  id: string;
  verificationId?: VerificationRecordId;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentDispute {
  id: DisputeId;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentDisputeEvidence {
  id: string;
  disputeId: DisputeId;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PersistentRuntimeEvent {
  id: EventId;
  postId: PostId;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PersistentViewerSession {
  id: string;
  postId: PostId;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PersistentTrustImpact {
  id: string;
  userId: UserId;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface PersistentSafetyReport {
  id: string;
  projectId: ProjectId;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PersistentRightsReport {
  id: string;
  projectId: ProjectId;
  payload: Record<string, unknown>;
  createdAt: string;
}
