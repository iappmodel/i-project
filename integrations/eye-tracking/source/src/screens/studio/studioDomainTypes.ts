/**
 * Core Studio domain shapes (Stages 1–10) — no collaboration imports to avoid cycles.
 */

import type { StudioMagicReveal } from './media/studioMagicMaskArtifacts';
import type { MediaAssetRecord } from './media/studioMediaTypes';
import type { StudioProjectSubtitles } from './media/studioCaptionArtifacts';

export interface StudioClip {
  id: string;
  trackId: string;
  startMs: number;
  endMs: number;
  assetId?: string;
  label?: string;
}

export interface StudioTrack {
  id: string;
  name: string;
  clips: StudioClip[];
}

export interface StudioTimelineState {
  durationMs: number;
  tracks: StudioTrack[];
  playheadMs: number;
}

export interface StudioCampaignState {
  id: string;
  title: string;
  rewardSummary: string;
  budgetUsd: number;
  requiresBrandApproval: boolean;
}

export interface StudioPublishSettings {
  visibility: 'draft' | 'unlisted' | 'public';
  allowComments: boolean;
  scheduledAt?: string;
}

export interface StudioDisclosures {
  sponsored: boolean;
  ageRestricted: boolean;
  paidPartnershipText?: string;
}

export interface StudioProject {
  id: string;
  title: string;
  /** Fingerprint of publish-critical slices — bumps when media/Magic/campaign changes after publish/approval. */
  contentFingerprint: string;
  /** Last version id that received explicit approvals (mock). */
  lastApprovedVersionId?: string;
  /** When true, UI shows locked overlay until reviews clear. */
  lockedByReview: boolean;
  /** Immutable id of published runtime package snapshot (mock). */
  publishedPackageId?: string;
  subtitles?: StudioProjectSubtitles;
}

export interface StudioPersistedSlice {
  project: StudioProject;
  timeline: StudioTimelineState;
  assets: MediaAssetRecord[];
  magicReveals: StudioMagicReveal[];
  campaign: StudioCampaignState;
  publishSettings: StudioPublishSettings;
  disclosures: StudioDisclosures;
}
