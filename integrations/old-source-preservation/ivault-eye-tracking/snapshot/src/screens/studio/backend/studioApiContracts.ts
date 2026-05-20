/**
 * [ i ] Studio Stage 8 — HTTP-shaped request/response contracts (types only; no transport).
 * Mutations require mutationMeta + idempotencyKey + actorUserId on the wire.
 */

import type {
  ApiResponse,
  AssetId,
  CampaignId,
  ClipId,
  DisputeId,
  EventId,
  LedgerEntryId,
  MagicRevealId,
  MutationMeta,
  Pagination,
  PostId,
  ProjectId,
  ServerDecision,
  TrackId,
  UserId,
  VerificationRecordId,
  WalletAccountId,
} from "./studioApiTypes";

/** Base for mutating endpoints (server must validate idempotency + actor). */
export interface StudioMutationRequestBase {
  mutationMeta: MutationMeta;
  idempotencyKey: string;
  actorUserId: UserId;
}

// ——— PROJECT ———
export interface CreateStudioProjectRequest extends StudioMutationRequestBase {
  title: string;
  draft?: Record<string, unknown>;
}
export type CreateStudioProjectResponse = ApiResponse<{ projectId: ProjectId }>;

export interface GetStudioProjectRequest {
  projectId: ProjectId;
}
export type GetStudioProjectResponse = ApiResponse<{ project: Record<string, unknown> }>;

export interface UpdateStudioProjectRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  patch: Record<string, unknown>;
}
export type UpdateStudioProjectResponse = ApiResponse<{ projectId: ProjectId }>;

export interface SaveStudioProjectSnapshotRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  snapshot: Record<string, unknown>;
  label?: string;
}
export type SaveStudioProjectSnapshotResponse = ApiResponse<{ snapshotId: string }>;

export interface ArchiveStudioProjectRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
}
export type ArchiveStudioProjectResponse = ApiResponse<{ projectId: ProjectId; archived: boolean }>;

export interface DeleteStudioProjectRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
}
export type DeleteStudioProjectResponse = ApiResponse<{ deleted: boolean }>;

// ——— ASSET ———
export interface CreateAssetUploadIntentRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  mimeType: string;
  byteSize: number;
  filename?: string;
}
export type CreateAssetUploadIntentResponse = ApiResponse<{ intentId: string; uploadUrl?: string }>;

export interface ConfirmAssetUploadRequest extends StudioMutationRequestBase {
  intentId: string;
}
export type ConfirmAssetUploadResponse = ApiResponse<{ assetId: AssetId }>;

export interface ImportExternalAssetRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  sourceUrl: string;
}
export type ImportExternalAssetResponse = ApiResponse<{ assetId: AssetId }>;

export interface DeleteAssetRequest extends StudioMutationRequestBase {
  assetId: AssetId;
}
export type DeleteAssetResponse = ApiResponse<{ deleted: boolean }>;

// ——— TIMELINE ———
export interface AddTrackRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  track: Record<string, unknown>;
}
export type AddTrackResponse = ApiResponse<{ trackId: TrackId }>;

export interface UpdateTrackRequest extends StudioMutationRequestBase {
  trackId: TrackId;
  patch: Record<string, unknown>;
}
export type UpdateTrackResponse = ApiResponse<{ trackId: TrackId }>;

export interface DeleteTrackRequest extends StudioMutationRequestBase {
  trackId: TrackId;
}
export type DeleteTrackResponse = ApiResponse<{ deleted: boolean }>;

export interface AddClipRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  clip: Record<string, unknown>;
}
export type AddClipResponse = ApiResponse<{ clipId: ClipId }>;

export interface UpdateClipRequest extends StudioMutationRequestBase {
  clipId: ClipId;
  patch: Record<string, unknown>;
}
export type UpdateClipResponse = ApiResponse<{ clipId: ClipId }>;

export interface DeleteClipRequest extends StudioMutationRequestBase {
  clipId: ClipId;
}
export type DeleteClipResponse = ApiResponse<{ deleted: boolean }>;

export interface CommitTimelineRevisionRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  revisionNote?: string;
}
export type CommitTimelineRevisionResponse = ApiResponse<{ revisionId: string }>;

// ——— MAGIC ———
export interface CreateMagicRevealRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  reveal: Record<string, unknown>;
}
export type CreateMagicRevealResponse = ApiResponse<{ revealId: MagicRevealId }>;

export interface UpdateMagicRevealRequest extends StudioMutationRequestBase {
  revealId: MagicRevealId;
  patch: Record<string, unknown>;
}
export type UpdateMagicRevealResponse = ApiResponse<{ revealId: MagicRevealId }>;

export interface DeleteMagicRevealRequest extends StudioMutationRequestBase {
  revealId: MagicRevealId;
}
export type DeleteMagicRevealResponse = ApiResponse<{ deleted: boolean }>;

export interface RunMagicSafetyScanRequest extends StudioMutationRequestBase {
  revealId: MagicRevealId;
}
export type RunMagicSafetyScanResponse = ApiResponse<ServerDecision & { scanId: string }>;

export interface PreviewMagicRevealUnlockRequest extends StudioMutationRequestBase {
  revealId: MagicRevealId;
  viewerContext: Record<string, unknown>;
}
export type PreviewMagicRevealUnlockResponse = ApiResponse<{ preview: Record<string, unknown> }>;

export interface ConfirmMagicRevealUnlockRequest extends StudioMutationRequestBase {
  revealId: MagicRevealId;
  viewerSessionId: string;
}
export type ConfirmMagicRevealUnlockResponse = ApiResponse<ServerDecision & { unlockId: string }>;

export interface GetMagicRevealRuntimeStateRequest {
  revealId: MagicRevealId;
}
export type GetMagicRevealRuntimeStateResponse = ApiResponse<{ state: Record<string, unknown> }>;

// ——— PUBLISH ———
export interface RunPublishValidationRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  postPackageDraft: Record<string, unknown>;
}
export type RunPublishValidationResponse = ApiResponse<ServerDecision & { checks: unknown[] }>;

export interface CreateExportJobRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  target: string;
  quality: string;
}
export type CreateExportJobResponse = ApiResponse<{ jobId: string }>;

export interface GetExportJobStatusRequest {
  jobId: string;
}
export type GetExportJobStatusResponse = ApiResponse<{ status: string; progress: number }>;

export interface BuildPostPackageRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  exportJobId: string;
}
export type BuildPostPackageResponse = ApiResponse<{ packageId: string; hash: string }>;

export interface PublishPostRequest extends StudioMutationRequestBase {
  packageId: string;
}
export type PublishPostResponse = ApiResponse<{ postId: PostId; signedSnapshot?: string }>;

export interface UnpublishPostRequest extends StudioMutationRequestBase {
  postId: PostId;
}
export type UnpublishPostResponse = ApiResponse<{ postId: PostId }>;

export interface ArchivePostRequest extends StudioMutationRequestBase {
  postId: PostId;
}
export type ArchivePostResponse = ApiResponse<{ postId: PostId }>;

// ——— WALLET / LEDGER ———
export interface GetWalletAccountsRequest {
  ownerUserId?: UserId;
  pagination?: Pagination;
}
export type GetWalletAccountsResponse = ApiResponse<{ accounts: unknown[] }>;

export interface SimulateLedgerPreviewRequest extends StudioMutationRequestBase {
  scenario: Record<string, unknown>;
}
export type SimulateLedgerPreviewResponse = ApiResponse<{ lines: unknown[] }>;

export interface CreateLedgerTransactionRequest extends StudioMutationRequestBase {
  lines: Record<string, unknown>[];
}
export type CreateLedgerTransactionResponse = ApiResponse<{ entryIds: LedgerEntryId[] }>;

export interface GetLedgerEntriesRequest {
  filter?: { projectId?: ProjectId; postId?: PostId };
  pagination?: Pagination;
}
export type GetLedgerEntriesResponse = ApiResponse<{ entries: unknown[] }>;

export interface ReleaseSettlementRequest extends StudioMutationRequestBase {
  unlockId: string;
}
export type ReleaseSettlementResponse = ApiResponse<ServerDecision & { released: boolean }>;

export interface ReverseSettlementRequest extends StudioMutationRequestBase {
  unlockId: string;
  reason: string;
}
export type ReverseSettlementResponse = ApiResponse<ServerDecision & { reversed: boolean }>;

export interface RefundUnlockRequest extends StudioMutationRequestBase {
  unlockId: string;
}
export type RefundUnlockResponse = ApiResponse<ServerDecision & { refunded: boolean }>;

// ——— CAMPAIGN ———
export interface CreateCampaignRequest extends StudioMutationRequestBase {
  projectId: ProjectId;
  campaign: Record<string, unknown>;
}
export type CreateCampaignResponse = ApiResponse<{ campaignId: CampaignId }>;

export interface UpdateCampaignRequest extends StudioMutationRequestBase {
  campaignId: CampaignId;
  patch: Record<string, unknown>;
}
export type UpdateCampaignResponse = ApiResponse<{ campaignId: CampaignId }>;

export interface ValidateCampaignRequest extends StudioMutationRequestBase {
  campaignId: CampaignId;
}
export type ValidateCampaignResponse = ApiResponse<ServerDecision>;

export interface ActivateCampaignRequest extends StudioMutationRequestBase {
  campaignId: CampaignId;
}
export type ActivateCampaignResponse = ApiResponse<ServerDecision>;

export interface PauseCampaignRequest extends StudioMutationRequestBase {
  campaignId: CampaignId;
}
export type PauseCampaignResponse = ApiResponse<{ campaignId: CampaignId }>;

export interface ResumeCampaignRequest extends StudioMutationRequestBase {
  campaignId: CampaignId;
}
export type ResumeCampaignResponse = ApiResponse<{ campaignId: CampaignId }>;

export interface CompleteCampaignRequest extends StudioMutationRequestBase {
  campaignId: CampaignId;
}
export type CompleteCampaignResponse = ApiResponse<{ campaignId: CampaignId }>;

export interface RecordCampaignActionRequest extends StudioMutationRequestBase {
  campaignId: CampaignId;
  action: Record<string, unknown>;
}
export type RecordCampaignActionResponse = ApiResponse<{ attemptId: string }>;

export interface VerifyCampaignActionRequest extends StudioMutationRequestBase {
  attemptId: string;
}
export type VerifyCampaignActionResponse = ApiResponse<ServerDecision>;

export interface PayCampaignRewardRequest extends StudioMutationRequestBase {
  attemptId: string;
}
export type PayCampaignRewardResponse = ApiResponse<ServerDecision & { ledgerEntryIds?: LedgerEntryId[] }>;

// ——— VERIFICATION ———
export interface CreateVerificationRecordRequest extends StudioMutationRequestBase {
  subject: Record<string, unknown>;
}
export type CreateVerificationRecordResponse = ApiResponse<{ verificationId: VerificationRecordId }>;

export interface RunVerificationRequest extends StudioMutationRequestBase {
  verificationId: VerificationRecordId;
}
export type RunVerificationResponse = ApiResponse<ServerDecision & { verificationId: VerificationRecordId }>;

export interface RunFraudAssessmentRequest extends StudioMutationRequestBase {
  context: Record<string, unknown>;
}
export type RunFraudAssessmentResponse = ApiResponse<{ assessmentId: string; score: number }>;

export interface CreatePOPSChallengeRequest extends StudioMutationRequestBase {
  verificationId: VerificationRecordId;
}
export type CreatePOPSChallengeResponse = ApiResponse<{ challengeId: string }>;

export interface CompletePOPSChallengeRequest extends StudioMutationRequestBase {
  challengeId: string;
  proof: Record<string, unknown>;
}
export type CompletePOPSChallengeResponse = ApiResponse<ServerDecision>;

export interface ApplySettlementDecisionRequest extends StudioMutationRequestBase {
  verificationId: VerificationRecordId;
}
export type ApplySettlementDecisionResponse = ApiResponse<ServerDecision>;

// ——— DISPUTE ———
export interface CreateDisputeRequest extends StudioMutationRequestBase {
  subject: Record<string, unknown>;
}
export type CreateDisputeResponse = ApiResponse<{ disputeId: DisputeId }>;

export interface AddDisputeEvidenceRequest extends StudioMutationRequestBase {
  disputeId: DisputeId;
  evidence: Record<string, unknown>;
}
export type AddDisputeEvidenceResponse = ApiResponse<{ evidenceId: string; immutable: true }>;

export interface ResolveDisputeRequest extends StudioMutationRequestBase {
  disputeId: DisputeId;
  resolution: Record<string, unknown>;
}
export type ResolveDisputeResponse = ApiResponse<ServerDecision>;

export interface GetDisputesRequest {
  projectId?: ProjectId;
  pagination?: Pagination;
}
export type GetDisputesResponse = ApiResponse<{ disputes: unknown[] }>;

// ——— RUNTIME ———
export interface GetFeedPostsRequest {
  cursor?: string;
  limit?: number;
}
export type GetFeedPostsResponse = ApiResponse<{ posts: unknown[]; pagination: Pagination }>;

export interface StartViewerSessionRequest extends StudioMutationRequestBase {
  postId: PostId;
}
export type StartViewerSessionResponse = ApiResponse<{ sessionId: string }>;

export interface UpdateViewerSessionRequest extends StudioMutationRequestBase {
  sessionId: string;
  patch: Record<string, unknown>;
}
export type UpdateViewerSessionResponse = ApiResponse<{ sessionId: string }>;

export interface RecordRuntimeActionRequest extends StudioMutationRequestBase {
  postId: PostId;
  action: Record<string, unknown>;
}
export type RecordRuntimeActionResponse = ApiResponse<{ eventId: EventId }>;

export interface ResolveRuntimeTapRequest extends StudioMutationRequestBase {
  postId: PostId;
  tap: Record<string, unknown>;
}
export type ResolveRuntimeTapResponse = ApiResponse<ServerDecision>;

export interface ConfirmRuntimeUnlockRequest extends StudioMutationRequestBase {
  postId: PostId;
  unlockIntent: Record<string, unknown>;
}
export type ConfirmRuntimeUnlockResponse = ApiResponse<ServerDecision & { unlockId?: string }>;

// ——— ANALYTICS ———
export interface GetCreatorPostAnalyticsRequest {
  postId: PostId;
  range?: { from: string; to: string };
}
export type GetCreatorPostAnalyticsResponse = ApiResponse<Record<string, unknown>>;

export interface GetCampaignAnalyticsRequest {
  campaignId: CampaignId;
}
export type GetCampaignAnalyticsResponse = ApiResponse<Record<string, unknown>>;

export interface GetMagicRevealAnalyticsRequest {
  revealId: MagicRevealId;
}
export type GetMagicRevealAnalyticsResponse = ApiResponse<Record<string, unknown>>;

export interface GetRiskMonitorRequest {
  projectId?: ProjectId;
}
export type GetRiskMonitorResponse = ApiResponse<Record<string, unknown>>;

export type ApiContractAuthorityLevel = "client_request" | "server_decision" | "immutable_event";

export interface ApiContractDescriptor {
  domain: string;
  name: string;
  requestType: string;
  responseType: string;
  authority: ApiContractAuthorityLevel;
}

export const STUDIO_API_CONTRACT_INDEX: ApiContractDescriptor[] = [
  { domain: "Projects", name: "POST /studio/projects", requestType: "CreateStudioProjectRequest", responseType: "CreateStudioProjectResponse", authority: "client_request" },
  { domain: "Projects", name: "GET /studio/projects/:id", requestType: "GetStudioProjectRequest", responseType: "GetStudioProjectResponse", authority: "client_request" },
  { domain: "Projects", name: "PATCH /studio/projects/:id", requestType: "UpdateStudioProjectRequest", responseType: "UpdateStudioProjectResponse", authority: "client_request" },
  { domain: "Projects", name: "POST /studio/projects/:id/snapshots", requestType: "SaveStudioProjectSnapshotRequest", responseType: "SaveStudioProjectSnapshotResponse", authority: "immutable_event" },
  { domain: "Projects", name: "POST /studio/projects/:id/archive", requestType: "ArchiveStudioProjectRequest", responseType: "ArchiveStudioProjectResponse", authority: "server_decision" },
  { domain: "Projects", name: "DELETE /studio/projects/:id", requestType: "DeleteStudioProjectRequest", responseType: "DeleteStudioProjectResponse", authority: "server_decision" },
  { domain: "Assets", name: "POST /studio/assets/upload-intent", requestType: "CreateAssetUploadIntentRequest", responseType: "CreateAssetUploadIntentResponse", authority: "client_request" },
  { domain: "Assets", name: "POST /studio/assets/confirm", requestType: "ConfirmAssetUploadRequest", responseType: "ConfirmAssetUploadResponse", authority: "server_decision" },
  { domain: "Assets", name: "POST /studio/assets/import", requestType: "ImportExternalAssetRequest", responseType: "ImportExternalAssetResponse", authority: "server_decision" },
  { domain: "Assets", name: "DELETE /studio/assets/:id", requestType: "DeleteAssetRequest", responseType: "DeleteAssetResponse", authority: "server_decision" },
  { domain: "Timeline", name: "POST /studio/timeline/tracks", requestType: "AddTrackRequest", responseType: "AddTrackResponse", authority: "client_request" },
  { domain: "Timeline", name: "PATCH /studio/timeline/tracks/:id", requestType: "UpdateTrackRequest", responseType: "UpdateTrackResponse", authority: "client_request" },
  { domain: "Timeline", name: "DELETE /studio/timeline/tracks/:id", requestType: "DeleteTrackRequest", responseType: "DeleteTrackResponse", authority: "client_request" },
  { domain: "Timeline", name: "POST /studio/timeline/clips", requestType: "AddClipRequest", responseType: "AddClipResponse", authority: "client_request" },
  { domain: "Timeline", name: "PATCH /studio/timeline/clips/:id", requestType: "UpdateClipRequest", responseType: "UpdateClipResponse", authority: "client_request" },
  { domain: "Timeline", name: "DELETE /studio/timeline/clips/:id", requestType: "DeleteClipRequest", responseType: "DeleteClipResponse", authority: "client_request" },
  { domain: "Timeline", name: "POST /studio/timeline/revisions", requestType: "CommitTimelineRevisionRequest", responseType: "CommitTimelineRevisionResponse", authority: "immutable_event" },
  { domain: "Magic", name: "POST /studio/magic/reveals", requestType: "CreateMagicRevealRequest", responseType: "CreateMagicRevealResponse", authority: "client_request" },
  { domain: "Magic", name: "PATCH /studio/magic/reveals/:id", requestType: "UpdateMagicRevealRequest", responseType: "UpdateMagicRevealResponse", authority: "client_request" },
  { domain: "Magic", name: "DELETE /studio/magic/reveals/:id", requestType: "DeleteMagicRevealRequest", responseType: "DeleteMagicRevealResponse", authority: "client_request" },
  { domain: "Magic", name: "POST /studio/magic/reveals/:id/safety-scan", requestType: "RunMagicSafetyScanRequest", responseType: "RunMagicSafetyScanResponse", authority: "server_decision" },
  { domain: "Magic", name: "POST /studio/magic/reveals/:id/unlock/preview", requestType: "PreviewMagicRevealUnlockRequest", responseType: "PreviewMagicRevealUnlockResponse", authority: "client_request" },
  { domain: "Magic", name: "POST /studio/magic/reveals/:id/unlock/confirm", requestType: "ConfirmMagicRevealUnlockRequest", responseType: "ConfirmMagicRevealUnlockResponse", authority: "server_decision" },
  { domain: "Magic", name: "GET /studio/magic/reveals/:id/runtime", requestType: "GetMagicRevealRuntimeStateRequest", responseType: "GetMagicRevealRuntimeStateResponse", authority: "server_decision" },
  { domain: "Publish", name: "POST /studio/publish/validate", requestType: "RunPublishValidationRequest", responseType: "RunPublishValidationResponse", authority: "server_decision" },
  { domain: "Publish", name: "POST /studio/publish/export-jobs", requestType: "CreateExportJobRequest", responseType: "CreateExportJobResponse", authority: "client_request" },
  { domain: "Publish", name: "GET /studio/publish/export-jobs/:id", requestType: "GetExportJobStatusRequest", responseType: "GetExportJobStatusResponse", authority: "client_request" },
  { domain: "Publish", name: "POST /studio/publish/post-packages", requestType: "BuildPostPackageRequest", responseType: "BuildPostPackageResponse", authority: "server_decision" },
  { domain: "Publish", name: "POST /studio/publish/posts", requestType: "PublishPostRequest", responseType: "PublishPostResponse", authority: "server_decision" },
  { domain: "Publish", name: "POST /studio/publish/posts/:id/unpublish", requestType: "UnpublishPostRequest", responseType: "UnpublishPostResponse", authority: "server_decision" },
  { domain: "Publish", name: "POST /studio/publish/posts/:id/archive", requestType: "ArchivePostRequest", responseType: "ArchivePostResponse", authority: "server_decision" },
  { domain: "Wallet / Ledger", name: "GET /studio/wallet/accounts", requestType: "GetWalletAccountsRequest", responseType: "GetWalletAccountsResponse", authority: "server_decision" },
  { domain: "Wallet / Ledger", name: "POST /studio/ledger/preview", requestType: "SimulateLedgerPreviewRequest", responseType: "SimulateLedgerPreviewResponse", authority: "client_request" },
  { domain: "Wallet / Ledger", name: "POST /studio/ledger/transactions", requestType: "CreateLedgerTransactionRequest", responseType: "CreateLedgerTransactionResponse", authority: "server_decision" },
  { domain: "Wallet / Ledger", name: "GET /studio/ledger/entries", requestType: "GetLedgerEntriesRequest", responseType: "GetLedgerEntriesResponse", authority: "server_decision" },
  { domain: "Wallet / Ledger", name: "POST /studio/ledger/settlement/release", requestType: "ReleaseSettlementRequest", responseType: "ReleaseSettlementResponse", authority: "server_decision" },
  { domain: "Wallet / Ledger", name: "POST /studio/ledger/settlement/reverse", requestType: "ReverseSettlementRequest", responseType: "ReverseSettlementResponse", authority: "server_decision" },
  { domain: "Wallet / Ledger", name: "POST /studio/ledger/unlock/refund", requestType: "RefundUnlockRequest", responseType: "RefundUnlockResponse", authority: "server_decision" },
  { domain: "Campaign", name: "POST /studio/campaigns", requestType: "CreateCampaignRequest", responseType: "CreateCampaignResponse", authority: "client_request" },
  { domain: "Campaign", name: "PATCH /studio/campaigns/:id", requestType: "UpdateCampaignRequest", responseType: "UpdateCampaignResponse", authority: "client_request" },
  { domain: "Campaign", name: "POST /studio/campaigns/:id/validate", requestType: "ValidateCampaignRequest", responseType: "ValidateCampaignResponse", authority: "server_decision" },
  { domain: "Campaign", name: "POST /studio/campaigns/:id/activate", requestType: "ActivateCampaignRequest", responseType: "ActivateCampaignResponse", authority: "server_decision" },
  { domain: "Campaign", name: "POST /studio/campaigns/:id/pause", requestType: "PauseCampaignRequest", responseType: "PauseCampaignResponse", authority: "server_decision" },
  { domain: "Campaign", name: "POST /studio/campaigns/:id/resume", requestType: "ResumeCampaignRequest", responseType: "ResumeCampaignResponse", authority: "server_decision" },
  { domain: "Campaign", name: "POST /studio/campaigns/:id/complete", requestType: "CompleteCampaignRequest", responseType: "CompleteCampaignResponse", authority: "server_decision" },
  { domain: "Campaign", name: "POST /studio/campaigns/:id/actions", requestType: "RecordCampaignActionRequest", responseType: "RecordCampaignActionResponse", authority: "client_request" },
  { domain: "Campaign", name: "POST /studio/campaigns/actions/:id/verify", requestType: "VerifyCampaignActionRequest", responseType: "VerifyCampaignActionResponse", authority: "server_decision" },
  { domain: "Campaign", name: "POST /studio/campaigns/actions/:id/pay", requestType: "PayCampaignRewardRequest", responseType: "PayCampaignRewardResponse", authority: "server_decision" },
  { domain: "Verification", name: "POST /studio/verification/records", requestType: "CreateVerificationRecordRequest", responseType: "CreateVerificationRecordResponse", authority: "client_request" },
  { domain: "Verification", name: "POST /studio/verification/records/:id/run", requestType: "RunVerificationRequest", responseType: "RunVerificationResponse", authority: "server_decision" },
  { domain: "Verification", name: "POST /studio/verification/fraud", requestType: "RunFraudAssessmentRequest", responseType: "RunFraudAssessmentResponse", authority: "server_decision" },
  { domain: "Verification", name: "POST /studio/verification/pops", requestType: "CreatePOPSChallengeRequest", responseType: "CreatePOPSChallengeResponse", authority: "server_decision" },
  { domain: "Verification", name: "POST /studio/verification/pops/:id/complete", requestType: "CompletePOPSChallengeRequest", responseType: "CompletePOPSChallengeResponse", authority: "server_decision" },
  { domain: "Verification", name: "POST /studio/verification/settlement", requestType: "ApplySettlementDecisionRequest", responseType: "ApplySettlementDecisionResponse", authority: "server_decision" },
  { domain: "Disputes", name: "POST /studio/disputes", requestType: "CreateDisputeRequest", responseType: "CreateDisputeResponse", authority: "client_request" },
  { domain: "Disputes", name: "POST /studio/disputes/:id/evidence", requestType: "AddDisputeEvidenceRequest", responseType: "AddDisputeEvidenceResponse", authority: "immutable_event" },
  { domain: "Disputes", name: "POST /studio/disputes/:id/resolve", requestType: "ResolveDisputeRequest", responseType: "ResolveDisputeResponse", authority: "server_decision" },
  { domain: "Disputes", name: "GET /studio/disputes", requestType: "GetDisputesRequest", responseType: "GetDisputesResponse", authority: "server_decision" },
  { domain: "Runtime", name: "GET /studio/runtime/feed", requestType: "GetFeedPostsRequest", responseType: "GetFeedPostsResponse", authority: "server_decision" },
  { domain: "Runtime", name: "POST /studio/runtime/sessions", requestType: "StartViewerSessionRequest", responseType: "StartViewerSessionResponse", authority: "server_decision" },
  { domain: "Runtime", name: "PATCH /studio/runtime/sessions/:id", requestType: "UpdateViewerSessionRequest", responseType: "UpdateViewerSessionResponse", authority: "client_request" },
  { domain: "Runtime", name: "POST /studio/runtime/posts/:id/actions", requestType: "RecordRuntimeActionRequest", responseType: "RecordRuntimeActionResponse", authority: "immutable_event" },
  { domain: "Runtime", name: "POST /studio/runtime/posts/:id/tap", requestType: "ResolveRuntimeTapRequest", responseType: "ResolveRuntimeTapResponse", authority: "server_decision" },
  { domain: "Runtime", name: "POST /studio/runtime/posts/:id/unlock", requestType: "ConfirmRuntimeUnlockRequest", responseType: "ConfirmRuntimeUnlockResponse", authority: "server_decision" },
  { domain: "Analytics", name: "GET /studio/analytics/posts/:id", requestType: "GetCreatorPostAnalyticsRequest", responseType: "GetCreatorPostAnalyticsResponse", authority: "server_decision" },
  { domain: "Analytics", name: "GET /studio/analytics/campaigns/:id", requestType: "GetCampaignAnalyticsRequest", responseType: "GetCampaignAnalyticsResponse", authority: "server_decision" },
  { domain: "Analytics", name: "GET /studio/analytics/magic/:id", requestType: "GetMagicRevealAnalyticsRequest", responseType: "GetMagicRevealAnalyticsResponse", authority: "server_decision" },
  { domain: "Analytics", name: "GET /studio/analytics/risk", requestType: "GetRiskMonitorRequest", responseType: "GetRiskMonitorResponse", authority: "server_decision" },
];
