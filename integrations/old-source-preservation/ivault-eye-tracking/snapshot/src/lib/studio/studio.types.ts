export type ISODateString = string;

export type AspectRatio = "9:16" | "1:1" | "16:9";

export type SessionStatus = "draft" | "recording" | "analyzing" | "editing" | "ready" | "exported";

export type ClipType = "video" | "audio" | "image";
export type ClipSource = "camera" | "upload" | "imported";
export type ClipStatus = "raw" | "selected" | "discarded" | "used";

export interface StudioClip {
  id: string;
  sessionId: string;
  title: string;
  durationSeconds: number;
  type: ClipType;
  source: ClipSource;
  status: ClipStatus;
  startOffsetSeconds: number;
  endOffsetSeconds: number;
  thumbnailGradient: string;
  qualityScore: number;
  highlightScore: number;
  hasFace: boolean;
  hasVoice: boolean;
  hasMusic: boolean;
  isBlurry: boolean;
  isSilent: boolean;
  isMarked: boolean;
  transcriptSnippet?: string;
  tags: string[];
}

export type MarkSource = "voice" | "tap" | "ai";
export interface StudioMark {
  id: string;
  clipId: string;
  timestampSeconds: number;
  label: string;
  source: MarkSource;
  confidence: number;
}

export type CommandIntent =
  | "capture_control"
  | "edit_request"
  | "enhancement_request"
  | "audio_request"
  | "publish_request"
  | "storage_request"
  | "proof_request"
  | "unknown";

export type CommandStatus = "parsed" | "previewed" | "applied" | "rejected";

export interface StudioCommand {
  id: string;
  raw: string;
  normalized: string;
  intent: CommandIntent;
  status: CommandStatus;
  createdAt: ISODateString;
  previewText: string;
}

export interface TimelineItem {
  id: string;
  clipId?: string;
  label: string;
  startSeconds: number;
  durationSeconds: number;
  colorToken?: string;
}

export type TimelineLayerType = "video" | "audio" | "text" | "effect" | "caption";
export interface TimelineLayer {
  id: string;
  type: TimelineLayerType;
  name: string;
  items: TimelineItem[];
}

export interface StudioTimeline {
  durationSeconds: number;
  playheadSeconds: number;
  layers: TimelineLayer[];
}

export interface ProofStatus {
  originalityFingerprint: "pending" | "generated" | "failed";
  custodyLog: "pending" | "active";
  deletionProtected: boolean;
}

export interface StudioSession {
  id: string;
  title: string;
  status: SessionStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  aspectRatio: AspectRatio;
  targetDurationSeconds?: number | null;
  rawDurationSeconds: number;
  estimatedFinalDurationSeconds?: number | null;
  storageUsedMb: number;
  recoverableStorageMb: number;
  clips: StudioClip[];
  timeline: StudioTimeline;
  marks: StudioMark[];
  commands: StudioCommand[];
  exportTargets: string[];
  proofStatus: ProofStatus;
}

export type StudioToolId =
  | "select"
  | "trim"
  | "captions"
  | "audio"
  | "effects"
  | "beauty"
  | "crop"
  | "magic"
  | "proof"
  | "publish"
  | "cleanup";

export interface StudioEffectPreview {
  id: string;
  type: "audio" | "visual" | "transition" | "caption" | "publish" | "cleanup" | "proof";
  label: string;
  description: string;
  createdAt: ISODateString;
}

// ── Stage 3: Recording state machine ─────────────────────────────────────────

export type RecordingStatus = "idle" | "recording" | "paused" | "stopped" | "analyzing";

export interface StudioRecordingState {
  status: RecordingStatus;
  activeTakeId: string | null;
  startedAt: ISODateString | null;
  pausedAt: ISODateString | null;
  stoppedAt: ISODateString | null;
  elapsedSeconds: number;
  takeCount: number;
  lastCommand: string | null;
}

// ── Stage 4: Auto-cut edit plans ──────────────────────────────────────────────

export type StudioEditPlanMode =
  | "target_duration"
  | "remove_dead_parts"
  | "marked_moments"
  | "multi_version"
  | "best_highlights";

export type StudioEditPlanStatus = "draft" | "previewed" | "accepted" | "rejected";

export interface StudioEditPlanClip {
  id: string;
  clipId: string;
  title: string;
  sourceStartSeconds: number;
  sourceEndSeconds: number;
  timelineStartSeconds: number;
  durationSeconds: number;
  reason: string;
  score: number;
}

export interface StudioEditPlan {
  id: string;
  title: string;
  mode: StudioEditPlanMode;
  status: StudioEditPlanStatus;
  targetDurationSeconds: number;
  estimatedDurationSeconds: number;
  createdAt: ISODateString;
  clips: StudioEditPlanClip[];
  excludedClipIds: string[];
  summary: string;
  warnings: string[];
}

// ── Stage 5: Storage cleanup ──────────────────────────────────────────────────

export type StudioCleanupCandidateAction =
  | "delete_candidate"
  | "keep_protected"
  | "compress_candidate"
  | "cloud_backup_candidate";

export type StudioCleanupReason =
  | "unused_raw"
  | "discarded"
  | "blurry"
  | "silent"
  | "low_quality"
  | "not_in_edit_plan"
  | "marked"
  | "used_in_edit_plan"
  | "proof_protected";

export interface StudioCleanupCandidate {
  id: string;
  clipId: string;
  title: string;
  action: StudioCleanupCandidateAction;
  reasons: StudioCleanupReason[];
  estimatedRecoverableMb: number;
  protected: boolean;
  explanation: string;
}

export type StudioCleanupPlanStatus = "draft" | "previewed" | "confirmed" | "rejected";

export interface StudioCleanupPlan {
  id: string;
  status: StudioCleanupPlanStatus;
  createdAt: ISODateString;
  totalStorageMb: number;
  recoverableStorageMb: number;
  protectedStorageMb: number;
  requiresConfirmation: true;
  candidates: StudioCleanupCandidate[];
  summary: string;
  warnings: string[];
}

// ── Stage 6: Publishing pipeline ─────────────────────────────────────────────

export type StudioPublishDestination =
  | "feed"
  | "stories"
  | "campaign"
  | "draft"
  | "proof_vault"
  | "external";

export type StudioPublishPlanStatus =
  | "draft"
  | "previewed"
  | "ready"
  | "published_mock"
  | "rejected";

export type StudioPublishReadinessGateStatus =
  | "passed"
  | "warning"
  | "blocked"
  | "pending";

export interface StudioPublishReadinessGate {
  id: string;
  label: string;
  status: StudioPublishReadinessGateStatus;
  message: string;
}

export interface StudioPublishCTA {
  label: string;
  url?: string;
  enabled: boolean;
}

export interface StudioPublishSchedule {
  mode: "now" | "scheduled";
  scheduledFor: string | null;
  label: string;
}

export interface StudioPublishPlan {
  id: string;
  status: StudioPublishPlanStatus;
  createdAt: string;
  destinations: StudioPublishDestination[];
  title: string;
  caption: string;
  hashtags: string[];
  disclosureRequired: boolean;
  disclosureText: string | null;
  cta: StudioPublishCTA;
  schedule: StudioPublishSchedule;
  readinessGates: StudioPublishReadinessGate[];
  proofRequired: boolean;
  originalityStatus: "pending" | "ready" | "not_required";
  selectedEditPlanId: string | null;
  selectedCleanupPlanId: string | null;
  summary: string;
  warnings: string[];
}

// ── Stage 7: Proof / originality types ───────────────────────────────────────

export type StudioProofStatus =
  | "not_started"
  | "pending"
  | "generated"
  | "failed";

export type StudioOriginalityStatus =
  | "unchecked"
  | "pending"
  | "likely_original"
  | "needs_review"
  | "duplicate_risk";

export type StudioProofArtifactType =
  | "visual_fingerprint"
  | "audio_fingerprint"
  | "edit_manifest"
  | "custody_log"
  | "export_receipt"
  | "cleanup_receipt"
  | "publish_receipt";

export interface StudioProofArtifact {
  id: string;
  type: StudioProofArtifactType;
  label: string;
  status: StudioProofStatus;
  createdAt: string;
  description: string;
  referenceId: string | null;
}

export type StudioCustodyEventType =
  | "session_created"
  | "clip_imported"
  | "mark_added"
  | "edit_plan_created"
  | "cleanup_plan_created"
  | "publish_plan_created"
  | "proof_generated"
  | "proof_package_exported";

export interface StudioCustodyEvent {
  id: string;
  type: StudioCustodyEventType;
  createdAt: string;
  label: string;
  description: string;
  referenceId: string | null;
}

export type StudioProofPlanStatus =
  | "draft"
  | "generated"
  | "export_previewed"
  | "rejected";

export interface StudioProofPlan {
  id: string;
  status: StudioProofPlanStatus;
  createdAt: string;
  originalityStatus: StudioOriginalityStatus;
  originalityScore: number;
  fingerprintId: string;
  custodyEventCount: number;
  artifactIds: string[];
  summary: string;
  warnings: string[];
}

export interface StudioProofPackage {
  id: string;
  proofPlanId: string;
  createdAt: string;
  status: "previewed" | "exported_mock" | "rejected";
  artifactIds: string[];
  manifestSummary: string;
  disclosure: string;
}

// ── Full UI state ─────────────────────────────────────────────────────────────

export interface StudioState {
  activeSession: StudioSession;
  selectedClipId: string | null;
  activeTool: StudioToolId;
  isPlaying: boolean;
  exportPanelOpen: boolean;
  commandPanelOpen: boolean;
  cleanupPreviewOpen: boolean;
  effectPreviews: StudioEffectPreview[];
  selectedExportTargets: string[];
  recording: StudioRecordingState;
  editPlans: StudioEditPlan[];
  selectedEditPlanId: string | null;
  autoCutPanelOpen: boolean;
  cleanupPlans: StudioCleanupPlan[];
  selectedCleanupPlanId: string | null;
  publishPlans: StudioPublishPlan[];
  selectedPublishPlanId: string | null;
  publishPanelOpen: boolean;
  proofArtifacts: StudioProofArtifact[];
  custodyEvents: StudioCustodyEvent[];
  proofPlans: StudioProofPlan[];
  proofPackages: StudioProofPackage[];
  selectedProofPlanId: string | null;
  selectedProofPackageId: string | null;
  proofPanelOpen: boolean;
}
