/**
 * [ i ] Studio — canonical types (editor + Magic / CAF / monetization).
 * Event name constants: `studioEvents.ts`.
 */

import type {
  ExportManifest,
  PostAgeRating,
  PostDisclosure,
  PostMonetizationMode,
  PostPackage,
  PostVisibility,
  PublishCheck,
  PublishStatus,
  PublishTarget,
  PublishedPost,
  StudioRightsReport,
  StudioSafetyReport,
} from "./publish/studioPublishTypes";

export type { StudioRightsReport, StudioSafetyReport } from "./publish/studioPublishTypes";
import type { StudioLedgerEntry, StudioRevealUnlock, StudioWalletAccount } from "./wallet/studioWalletTypes";

export type StudioMode = "manual" | "hybrid" | "ai";

export type StudioProjectStatus =
  | "empty"
  | "draft"
  | "ready"
  | "saving"
  | "saved"
  | "exporting"
  | "exported"
  | "published"
  | "failed";

export type StudioAssetType = "video" | "image" | "audio" | "subtitle" | "sticker" | "render";

export type StudioTrackType =
  | "video"
  | "audio"
  | "text"
  | "subtitle"
  | "sticker"
  | "effect"
  | "filter"
  | "adjustment"
  | "compliance"
  | "magic"
  /** @deprecated prefer `"magic"` */
  | "magic_reserved";

/** Tool rail — commodity + proprietary Magic / CAF / economy. */
export type StudioTool =
  | "trim"
  | "filters"
  | "beauty"
  | "effects"
  | "blur_caf"
  | "audio"
  | "text"
  | "stickers"
  | "speed"
  | "captions"
  | "magic"
  /** Stage 6/7 — campaign & brand economics (local). */
  | "campaign"
  /** Stage 7 — verification, POPS, fraud, disputes (local simulation). */
  | "verify"
  | "monetize"
  | "rights_safety"
  /** Stage 8 — backend readiness (contracts, mock persistence, boundaries). */
  | "backend"
  | "export"
  | "publish"
  /** Stage 5 — app-level runtime feed preview (local simulation). */
  | "runtime_feed"
  /** Stage 5 — creator post dashboard (local simulation). */
  | "creator_dashboard";

export type AspectRatio = "9:16" | "1:1" | "4:5" | "16:9" | "original";

export type StudioExportTarget =
  | "i_feed"
  | "story"
  | "campaign"
  | "private_link"
  | "download"
  | "external_platform";

export type StudioExportQuality = "preview" | "standard" | "high" | "original";

export type StudioExportJobStatus = "idle" | "queued" | "exporting" | "completed" | "failed";

export interface StudioExportSettings {
  target: StudioExportTarget;
  aspectRatio: AspectRatio;
  quality: StudioExportQuality;
  includeWatermark: boolean;
  status: StudioExportJobStatus;
  progress: number;
}

export type RevealType =
  | "always_hidden"
  | "free_tap_reveal"
  | "tip_to_reveal"
  | "pay_to_reveal"
  | "watch_to_reveal"
  | "follow_to_reveal"
  | "subscribe_to_reveal"
  | "trust_to_reveal"
  | "age_to_reveal"
  | "location_to_reveal"
  | "time_to_reveal"
  | "collective_reveal"
  | "creator_approval_reveal";

export type RevealTargetType =
  | "region"
  | "clip_segment"
  | "audio_segment"
  | "caption_segment"
  | "full_post"
  | "download_asset";

export type HiddenRenderMode = "blur" | "pixelate" | "blackout" | "frosted" | "symbol" | "teaser_overlay";

export type RevealTrackingMode =
  | "none"
  | "manual_keyframes"
  | "face_tracking"
  | "object_tracking"
  | "screen_tracking";

export type MagicRevealStatus = "draft" | "active" | "paused" | "expired" | "blocked" | "deleted";

export type MagicCoin = "iCoin" | "vCoin" | "aCoin" | "uCoin";

export type RevealSafetyClass =
  | "normal"
  | "privacy_sensitive"
  | "identity_sensitive"
  | "minor_sensitive"
  | "sexual_sensitive"
  | "medical_sensitive"
  | "financial_sensitive"
  | "location_sensitive"
  | "violence_sensitive"
  | "brand_sensitive"
  | "blocked";

export interface MagicRevealGeometry {
  shape: "rectangle" | "ellipse" | "polygon" | "mask" | "tracked_object";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  points?: Array<{ x: number; y: number }>;
}

export interface MagicReveal {
  id: string;
  projectId: string;
  ownerUserId: string;
  name: string;
  description?: string;
  targetType: RevealTargetType;
  timelineStartMs: number;
  timelineEndMs: number;
  geometry?: MagicRevealGeometry;
  tracking: {
    mode: RevealTrackingMode;
    confidence?: number;
    trackingData?: Record<string, unknown>;
  };
  hiddenRender: {
    mode: HiddenRenderMode;
    strength: number;
    overlayText?: string;
    icon?: string;
  };
  revealType: RevealType;
  pricing?: {
    coin: MagicCoin;
    amount: number;
    allowCustomTip?: boolean;
    minimumTip?: number;
  };
  reward?: {
    viewerRewardEnabled: boolean;
    viewerRewardCoin?: MagicCoin;
    viewerRewardAmount?: number;
    creatorRewardEnabled: boolean;
    creatorRewardCoin?: MagicCoin;
    creatorRewardAmount?: number;
  };
  eligibility: {
    minAge?: number;
    minTrustScore?: number;
    requireVerifiedHuman?: boolean;
    requireFollower?: boolean;
    requireSubscriber?: boolean;
    requireLocation?: { latitude: number; longitude: number; radiusMeters: number };
    revealAt?: string;
    revealAfterVerifiedViews?: number;
    revealAfterTotalTips?: number;
  };
  /** Mock UI: community tip progress toward `revealAfterTotalTips`. */
  collectiveProgress?: { current: number; goal: number };
  unlockPolicy: {
    duration: "once" | "session" | "24h" | "7d" | "permanent";
    transferable: boolean;
    refundable: boolean;
    maxUnlocksPerViewer?: number;
    maxTotalUnlocks?: number;
  };
  settlement: {
    creatorShareBps: number;
    platformFeeBps: number;
    viewerRewardBps?: number;
    pendingHoldSeconds: number;
  };
  safety: {
    safetyClass: RevealSafetyClass;
    requiresSafetyScan: boolean;
    safetyStatus: "pending" | "passed" | "warning" | "blocked";
    ageGateRequired: boolean;
    monetizationAllowed: boolean;
    monetizationRestrictionReason?: string;
    publishBlocked?: boolean;
  };
  status: MagicRevealStatus;
  createdAt: string;
  updatedAt: string;
}

export type RevealUnlockVerificationStatus = "pending" | "verified" | "failed";

export type RevealUnlockStatus = "pending" | "completed" | "expired" | "refunded";

export interface RevealUnlockTransaction {
  id: string;
  revealId: string;
  postId: string;
  viewerUserId: string;
  creatorUserId: string;
  unlockType: string;
  coin: MagicCoin;
  amount: number;
  creatorGrossAmount: number;
  platformFeeAmount: number;
  viewerRewardAmount: number;
  verificationStatus: RevealUnlockVerificationStatus;
  unlockStatus: RevealUnlockStatus;
  unlockedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface StudioCAFSegment {
  id: string;
  projectId: string;
  clipId?: string;
  timelineStartMs: number;
  timelineEndMs: number;
  shape: "rectangle" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  trackingMode: "static" | "face" | "object" | "manual_keyframes" | "ai_tracking";
  blurStrength: number;
  renderMode: "blur" | "pixelate" | "blackout" | "frosted" | "symbol" | "hidden";
  accessType: string;
  status: "draft" | "active" | "disabled" | "flagged" | "expired";
}

export type StudioPostMonetizationKind =
  | "free"
  | "earn_enabled"
  | "sponsored"
  | "paid"
  | "subscriber_only"
  | "tip_enabled"
  | "campaign"
  | "unlockable";

export interface StudioMonetizationRule {
  postKind: StudioPostMonetizationKind;
  viewerEarnsOnWatch: boolean;
  viewerEarnsOnComplete: boolean;
  viewerEarnsOnUnlock: boolean;
  creatorEarnsPerVerifiedView: boolean;
  creatorEarnsPerUnlock: boolean;
  brandPaysPerVerifiedAction: boolean;
  minimumTipCoins?: number;
  fixedPriceCoins?: number;
}

export interface StudioSubtitleCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
}

export interface StudioSubtitle {
  id: string;
  language: string;
  cues: StudioSubtitleCue[];
}

export interface StudioExportJob {
  id: string;
  exportType: string;
  status: "idle" | "queued" | "exporting" | "completed" | "failed";
  quality?: StudioExportQuality;
}

export type MagicPanelTab = "hide" | "reveal" | "price" | "reward" | "rules";

export type ViewerUnlockScenario =
  | "always_hidden"
  | "free"
  | "tip"
  | "pay"
  | "watch"
  | "trust"
  | "age"
  | "collective"
  | "creator_approval"
  | "follow"
  | "subscribe"
  | "time"
  | "location";

export interface StudioProject {
  id: string;
  ownerUserId: string;
  title: string;
  status: StudioProjectStatus;
  mode: StudioMode;
  aspectRatio: AspectRatio;
  durationMs: number;
  canvasWidth: number;
  canvasHeight: number;
  activeTool: StudioTool;
  selectedClipId?: string;
  selectedTrackId?: string;
  playheadMs: number;
  isPlaying: boolean;
  zoom: number;
  assets: StudioAsset[];
  tracks: StudioTrack[];
  clips: StudioClip[];
  overlays: StudioTextOverlay[];
  exportSettings: StudioExportSettings;
  createdAt: string;
  updatedAt: string;

  magicReveals: MagicReveal[];
  cafSegments: StudioCAFSegment[];
  monetization: StudioMonetizationRule;
  rightsReport: StudioRightsReport;
  safetyReport: StudioSafetyReport;
  subtitles: StudioSubtitle[];
  exportJobs: StudioExportJob[];

  magicPanelTab: MagicPanelTab;
  selectedMagicRevealId?: string;
  magicTargetSelection: string | null;
  previewUnlockSheetOpen: boolean;
  unlockPreviewScenario: ViewerUnlockScenario;

  /** Stage 4 — publish pipeline (local simulation). */
  caption: string;
  hashtags: string[];
  visibility: PostVisibility;
  publishTarget: PublishTarget;
  monetizationMode: PostMonetizationMode;
  publishStatus: PublishStatus;
  ageRating: PostAgeRating;
  disclosures: PostDisclosure[];
  publishChecks: PublishCheck[];
  exportManifest?: ExportManifest;
  postPackage?: PostPackage;
  publishedPost?: PublishedPost;
  beautyEditsApplied?: boolean;
  importedMedia?: boolean;

  publishValidationErrors?: string[];
}

export type StudioAssetIngestStatus = "ready" | "processing" | "error";

export interface StudioAsset {
  id: string;
  type: StudioAssetType;
  name: string;
  sourceUrl: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number;
  width?: number;
  height?: number;
  status: StudioAssetIngestStatus;
  createdAt: string;
}

export interface StudioTrack {
  id: string;
  projectId: string;
  type: StudioTrackType;
  name: string;
  sortOrder: number;
  locked: boolean;
  muted: boolean;
  visible: boolean;
}

/** Clip lane type may differ slightly from parent track (e.g. caption, marker). */
export type StudioClipType = StudioTrackType | "caption" | "marker";

export interface StudioClip {
  id: string;
  projectId: string;
  trackId: string;
  assetId?: string;
  type: StudioClipType;
  name: string;
  timelineStartMs: number;
  timelineEndMs: number;
  sourceStartMs: number;
  sourceEndMs: number;
  color: string;
  locked: boolean;
  muted: boolean;
  visible: boolean;
  transform: Record<string, unknown>;
  effects: Record<string, unknown>;
}

export interface StudioTextOverlay {
  id: string;
  clipId?: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  startMs: number;
  endMs: number;
}

export interface StudioEvent {
  id: string;
  type: string;
  projectId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type StudioUploadPhase = "idle" | "dragging" | "uploading" | "uploaded" | "error";

export interface StudioUploadState {
  phase: StudioUploadPhase;
  message?: string;
}

/** Stage 8–9 — BackendReadinessPanel sub-tabs. */
export type StudioBackendPanelTab =
  | "connection"
  | "api"
  | "persistence"
  | "boundary"
  | "authority"
  | "schema"
  | "migrations"
  | "rls"
  | "edge_functions"
  | "checklist";

export interface StudioBackendEventRow {
  type: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

/** Mock post stats for Magic unlock / collective simulation (Stage 3). */
export type StudioSimPost = {
  postId: string;
  verifiedViews: number;
  totalTips: number;
  publishedAt: string;
};

/** Stage 7 — sim inputs for Magic unlock verification in Studio preview (no real sensors). */
export interface StudioUnlockVerificationSim {
  watchMs: number;
  attentionScore: number;
  ageGatePassed: boolean;
  disclosureAcknowledged: boolean;
  locationMatch: boolean;
  qrScanned: boolean;
  sessionFlagged: boolean;
}

export interface StudioState {
  project: StudioProject;
  history: StudioProject[];
  future: StudioProject[];
  events: StudioEvent[];
  uploadState: StudioUploadState;
  inspectorOpen: boolean;
  /** Stage 4 UI */
  publishPanelOpen: boolean;
  safetyReportPanelOpen: boolean;
  rightsReportPanelOpen: boolean;
  runtimePreviewOpen: boolean;
  /** Snapshot for feed runtime preview (immutable vs live project). */
  runtimePreviewPackage: PostPackage | null;

  /** Stage 3 — local wallet / unlock simulation (not persisted, not undo). */
  studioSimPost: StudioSimPost;
  walletAccounts: StudioWalletAccount[];
  ledgerEntries: StudioLedgerEntry[];
  unlocks: StudioRevealUnlock[];
  selectedUnlockId?: string;
  unlockSimulatorOpen: boolean;
  walletPanelOpen: boolean;
  settlementSummaryOpen: boolean;

  /** Stage 8 — mock persistence + repository (no production backend). */
  persistenceAdapter: import("./backend/studioPersistenceAdapter").StudioPersistenceAdapter;
  repository: import("./backend/studioRepository").StudioRepository;
  /** Stage 9 — resolved backend flags + Supabase readiness (mock default). */
  backendConfig: import("./backend/studioBackendConfig").StudioBackendConfig;
  backendHealth: import("./backend/studioBackendHealth").StudioBackendHealthSnapshot;
  /** Effective persistence path: `supabase` only when URL+anon key present and mode allows; else `mock`. */
  activeBackendMode: import("./backend/studioBackendConfig").BackendMode;
  supabaseConfigured: boolean;
  backendReadinessOpen: boolean;
  persistedSnapshotMeta: { projectId: string; savedAt: string } | null;
  backendSyncStatus: "idle" | "syncing" | "ok" | "error";
  backendEvents: StudioBackendEventRow[];
  selectedBackendPanel: StudioBackendPanelTab;

  /** Stage 7 — verification / fraud / POPS / disputes (local simulation only). */
  verificationRecords: import("./verification/studioVerificationTypes").VerificationRecord[];
  fraudAssessments: import("./verification/studioVerificationTypes").FraudAssessment[];
  popsChallenges: import("./verification/studioVerificationTypes").POPSChallenge[];
  disputes: import("./verification/studioVerificationTypes").Dispute[];
  selectedVerificationId?: string;
  selectedDisputeId?: string;
  verificationPanelOpen: boolean;
  riskMonitorOpen: boolean;
  /** Studio-side campaign reward claim keys `postId_viewerAccountId` (dedupe mock). */
  studioCampaignClaimKeys: string[];
  unlockVerificationSim: StudioUnlockVerificationSim;
  /** Last Magic unlock confirm outcome message (success or block reason). */
  lastConfirmUnlockMessage?: string;
}
