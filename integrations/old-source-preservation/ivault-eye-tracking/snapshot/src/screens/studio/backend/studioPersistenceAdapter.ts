/**
 * [ i ] Studio Stage 8 — persistence port (mock, Supabase stub, or future Postgres).
 */

import type { ApiResponse } from "./studioApiTypes";
import type {
  PersistentCampaign,
  PersistentCampaignActionAttempt,
  PersistentDispute,
  PersistentExportJob,
  PersistentFraudAssessment,
  PersistentLedgerEntry,
  PersistentMagicReveal,
  PersistentPOPSChallenge,
  PersistentPostPackage,
  PersistentPublishedPost,
  PersistentRuntimeEvent,
  PersistentStudioAsset,
  PersistentStudioClip,
  PersistentStudioProject,
  PersistentStudioTrack,
  PersistentVerificationRecord,
  PersistentViewerSession,
  PersistentWalletAccount,
} from "./studioPersistenceTypes";

export interface StudioPersistenceAdapter {
  createProject(input: {
    id: string;
    ownerUserId: string;
    title: string;
    draftPayload: Record<string, unknown>;
    status: string;
  }): Promise<ApiResponse<PersistentStudioProject>>;
  getProject(projectId: string): Promise<ApiResponse<PersistentStudioProject>>;
  updateProject(projectId: string, patch: Partial<Pick<PersistentStudioProject, "title" | "draftPayload" | "status">>): Promise<ApiResponse<PersistentStudioProject>>;
  saveProjectSnapshot(projectId: string, snapshot: Record<string, unknown>, label?: string): Promise<ApiResponse<{ id: string }>>;
  listProjects(ownerUserId?: string): Promise<ApiResponse<PersistentStudioProject[]>>;
  archiveProject(projectId: string): Promise<ApiResponse<PersistentStudioProject>>;
  deleteProject(projectId: string): Promise<ApiResponse<{ deleted: boolean }>>;

  createAsset(projectId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentStudioAsset>>;
  confirmAsset(assetId: string): Promise<ApiResponse<PersistentStudioAsset>>;
  getAsset(assetId: string): Promise<ApiResponse<PersistentStudioAsset>>;
  listAssets(projectId: string): Promise<ApiResponse<PersistentStudioAsset[]>>;
  deleteAsset(assetId: string): Promise<ApiResponse<{ deleted: boolean }>>;

  saveTracks(projectId: string, tracks: PersistentStudioTrack[]): Promise<ApiResponse<PersistentStudioTrack[]>>;
  saveClips(projectId: string, clips: PersistentStudioClip[]): Promise<ApiResponse<PersistentStudioClip[]>>;
  commitTimelineRevision(projectId: string, meta: Record<string, unknown>): Promise<ApiResponse<{ revisionId: string }>>;

  createMagicReveal(projectId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentMagicReveal>>;
  updateMagicReveal(revealId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentMagicReveal>>;
  deleteMagicReveal(revealId: string): Promise<ApiResponse<{ deleted: boolean }>>;
  listMagicReveals(projectId: string): Promise<ApiResponse<PersistentMagicReveal[]>>;
  runMagicSafetyScan(revealId: string): Promise<ApiResponse<{ scanId: string; status: string }>>;

  createExportJob(projectId: string, input: { ownerUserId: string; label: string }): Promise<ApiResponse<PersistentExportJob>>;
  updateExportJob(jobId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentExportJob>>;
  buildPostPackage(
    projectId: string,
    exportJobId: string,
    input: { ownerUserId: string; postPackage: Record<string, unknown> }
  ): Promise<ApiResponse<PersistentPostPackage>>;
  publishPost(packageId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentPublishedPost>>;
  getPublishedPost(postId: string): Promise<ApiResponse<PersistentPublishedPost>>;
  listPublishedPosts(projectId?: string): Promise<ApiResponse<PersistentPublishedPost[]>>;

  getWalletAccount(id: string): Promise<ApiResponse<PersistentWalletAccount>>;
  listWalletAccounts(ownerUserId?: string): Promise<ApiResponse<PersistentWalletAccount[]>>;
  createLedgerEntries(entries: PersistentLedgerEntry[]): Promise<ApiResponse<PersistentLedgerEntry[]>>;
  listLedgerEntries(filter?: { projectId?: string; postId?: string }): Promise<ApiResponse<PersistentLedgerEntry[]>>;
  getLedgerEntriesForUnlock(unlockId: string): Promise<ApiResponse<PersistentLedgerEntry[]>>;
  releaseSettlement(unlockId: string): Promise<ApiResponse<{ released: boolean }>>;
  reverseSettlement(unlockId: string): Promise<ApiResponse<{ reversed: boolean }>>;

  createCampaign(projectId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentCampaign>>;
  updateCampaign(campaignId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentCampaign>>;
  listCampaigns(projectId: string): Promise<ApiResponse<PersistentCampaign[]>>;
  recordCampaignActionAttempt(campaignId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentCampaignActionAttempt>>;
  updateCampaignActionAttempt(attemptId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentCampaignActionAttempt>>;

  createVerificationRecord(payload: Record<string, unknown>): Promise<ApiResponse<PersistentVerificationRecord>>;
  updateVerificationRecord(id: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentVerificationRecord>>;
  createFraudAssessment(payload: Record<string, unknown>): Promise<ApiResponse<PersistentFraudAssessment>>;
  createPOPSChallenge(payload: Record<string, unknown>): Promise<ApiResponse<PersistentPOPSChallenge>>;
  updatePOPSChallenge(id: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentPOPSChallenge>>;

  createDispute(payload: Record<string, unknown>): Promise<ApiResponse<PersistentDispute>>;
  addDisputeEvidence(disputeId: string, evidence: Record<string, unknown>): Promise<ApiResponse<{ id: string }>>;
  updateDispute(disputeId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentDispute>>;
  listDisputes(filter?: { projectId?: string }): Promise<ApiResponse<PersistentDispute[]>>;

  createViewerSession(postId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentViewerSession>>;
  updateViewerSession(sessionId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentViewerSession>>;
  recordRuntimeEvent(postId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentRuntimeEvent>>;
  listRuntimeEvents(postId: string): Promise<ApiResponse<PersistentRuntimeEvent[]>>;

  getCreatorPostAnalytics(postId: string): Promise<ApiResponse<Record<string, unknown>>>;
  getCampaignAnalytics(campaignId: string): Promise<ApiResponse<Record<string, unknown>>>;
  getMagicRevealAnalytics(revealId: string): Promise<ApiResponse<Record<string, unknown>>>;
}
