/**
 * [ i ] Studio Stage 9 — Supabase-backed adapter (partial). Financial/security paths return SERVER_AUTHORITY_REQUIRED.
 */

import { getSupabaseClient } from "../../../lib/supabase/supabaseClient";
import { toApiError } from "../../../lib/supabase/supabaseErrors";
import { apiError, apiSuccess, type ApiResponse, type ProjectId, type UserId } from "./studioApiTypes";
import type { StudioBackendConfig } from "./studioBackendConfig";
import type { StudioPersistenceAdapter } from "./studioPersistenceAdapter";
import {
  assetToRow,
  campaignToRow,
  clipToRow,
  magicRevealToRow,
  postPackageToRow,
  rowToAsset,
  rowToCampaign,
  rowToClip,
  rowToMagicReveal,
  rowToPostPackage,
  rowToProject,
  rowToTrack,
  trackToRow,
} from "./supabaseMappers";
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

function cheapHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `pkg_${(h >>> 0).toString(16)}`;
}

function serverAuthority<T>(detail?: string): Promise<ApiResponse<T>> {
  return Promise.resolve(
    apiError(
      "SERVER_AUTHORITY_REQUIRED",
      detail ??
        "Operation must run on Edge Function or backend with service role — client adapter refuses to fake success.",
      {}
    )
  );
}

function edgeRequired<T>(detail?: string): Promise<ApiResponse<T>> {
  return Promise.resolve(
    apiError("EDGE_FUNCTION_REQUIRED", detail ?? "Invoke the documented Edge Function; not available from anon client adapter.", {})
  );
}

function notConfigured<T>(): Promise<ApiResponse<T>> {
  return Promise.resolve(apiError("NOT_CONFIGURED", "Supabase client is not available."));
}

export class SupabaseStudioPersistenceAdapter implements StudioPersistenceAdapter {
  constructor(private readonly _config: StudioBackendConfig) {}

  private client() {
    return getSupabaseClient();
  }

  async createProject(input: {
    id: string;
    ownerUserId: string;
    title: string;
    draftPayload: Record<string, unknown>;
    status: string;
  }): Promise<ApiResponse<PersistentStudioProject>> {
    const c = this.client();
    if (!c) return notConfigured();
    const t = new Date().toISOString();
    const row = {
      id: input.id,
      owner_user_id: input.ownerUserId,
      title: input.title,
      status: input.status,
      version: 1,
      draft_payload: input.draftPayload,
      created_at: t,
      updated_at: t,
      deleted_at: null,
    };
    const { data, error } = await c.from("studio_projects").insert(row).select("*").single();
    if (error) return toApiError(error, "PROJECT_CREATE_FAILED");
    return apiSuccess(rowToProject(data as Record<string, unknown>));
  }

  async getProject(projectId: string): Promise<ApiResponse<PersistentStudioProject>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("studio_projects").select("*").eq("id", projectId).maybeSingle();
    if (error) return toApiError(error, "PROJECT_GET_FAILED");
    if (!data) return apiError("NOT_FOUND", "Project not found");
    return apiSuccess(rowToProject(data as Record<string, unknown>));
  }

  async updateProject(
    projectId: string,
    patch: Partial<Pick<PersistentStudioProject, "title" | "draftPayload" | "status">>
  ): Promise<ApiResponse<PersistentStudioProject>> {
    const c = this.client();
    if (!c) return notConfigured();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.title != null) row.title = patch.title;
    if (patch.status != null) row.status = patch.status;
    if (patch.draftPayload != null) row.draft_payload = patch.draftPayload;
    const { data, error } = await c.from("studio_projects").update(row).eq("id", projectId).select("*").single();
    if (error) return toApiError(error, "PROJECT_UPDATE_FAILED");
    return apiSuccess(rowToProject(data as Record<string, unknown>));
  }

  async saveProjectSnapshot(
    projectId: string,
    snapshot: Record<string, unknown>,
    label?: string
  ): Promise<ApiResponse<{ id: string }>> {
    const c = this.client();
    if (!c) return notConfigured();
    const proj = await this.getProject(projectId);
    if (!proj.ok) return proj as ApiResponse<{ id: string }>;
    const snapRow = {
      project_id: projectId,
      version: proj.data.version,
      snapshot,
      meta: { label: label ?? "manual" },
      actor_user_id: proj.data.ownerUserId,
    };
    const { data, error } = await c.from("studio_project_snapshots").insert(snapRow).select("id").single();
    if (error) return toApiError(error, "SNAPSHOT_FAILED");
    return apiSuccess({ id: String((data as { id: string }).id) });
  }

  async listProjects(ownerUserId?: string): Promise<ApiResponse<PersistentStudioProject[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    let q = c.from("studio_projects").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
    if (ownerUserId) q = q.eq("owner_user_id", ownerUserId);
    const { data, error } = await q;
    if (error) return toApiError(error, "PROJECT_LIST_FAILED");
    const rows = (data ?? []) as Record<string, unknown>[];
    return apiSuccess(rows.map(rowToProject));
  }

  async archiveProject(projectId: string): Promise<ApiResponse<PersistentStudioProject>> {
    return this.updateProject(projectId, { status: "archived" });
  }

  async deleteProject(projectId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { error } = await c
      .from("studio_projects")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", projectId);
    if (error) return toApiError(error, "PROJECT_DELETE_FAILED");
    return apiSuccess({ deleted: true });
  }

  async createAsset(projectId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentStudioAsset>> {
    const c = this.client();
    if (!c) return notConfigured();
    const t = new Date().toISOString();
    const row = {
      id: input.id ?? crypto.randomUUID?.() ?? `asset_${Date.now()}`,
      project_id: projectId,
      owner_user_id: String(input.ownerUserId ?? input.owner_user_id ?? ""),
      status: String(input.status ?? "draft"),
      name: String(input.name ?? "asset"),
      mime_type: String(input.mime_type ?? input.mimeType ?? "application/octet-stream"),
      size_bytes: Number(input.size_bytes ?? input.sizeBytes ?? 0),
      payload: asRecord(input.payload ?? input),
      created_at: t,
      updated_at: t,
      deleted_at: null,
    };
    const { data, error } = await c.from("studio_assets").insert(row).select("*").single();
    if (error) return toApiError(error, "ASSET_CREATE_FAILED");
    return apiSuccess(rowToAsset(data as Record<string, unknown>));
  }

  async confirmAsset(assetId: string): Promise<ApiResponse<PersistentStudioAsset>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c
      .from("studio_assets")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", assetId)
      .select("*")
      .single();
    if (error) return toApiError(error, "ASSET_CONFIRM_FAILED");
    return apiSuccess(rowToAsset(data as Record<string, unknown>));
  }

  async getAsset(assetId: string): Promise<ApiResponse<PersistentStudioAsset>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("studio_assets").select("*").eq("id", assetId).maybeSingle();
    if (error) return toApiError(error, "ASSET_GET_FAILED");
    if (!data) return apiError("NOT_FOUND", "Asset not found");
    return apiSuccess(rowToAsset(data as Record<string, unknown>));
  }

  async listAssets(projectId: string): Promise<ApiResponse<PersistentStudioAsset[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("studio_assets").select("*").eq("project_id", projectId).is("deleted_at", null);
    if (error) return toApiError(error, "ASSET_LIST_FAILED");
    return apiSuccess(((data ?? []) as Record<string, unknown>[]).map(rowToAsset));
  }

  async deleteAsset(assetId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { error } = await c
      .from("studio_assets")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", assetId);
    if (error) return toApiError(error, "ASSET_DELETE_FAILED");
    return apiSuccess({ deleted: true });
  }

  async saveTracks(projectId: string, tracks: PersistentStudioTrack[]): Promise<ApiResponse<PersistentStudioTrack[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    const rows = tracks.map((t) => trackToRow({ ...t, projectId: projectId as PersistentStudioTrack["projectId"] }));
    const { data, error } = await c.from("studio_tracks").upsert(rows, { onConflict: "id" }).select("*");
    if (error) return toApiError(error, "TRACKS_SAVE_FAILED");
    return apiSuccess(((data ?? []) as Record<string, unknown>[]).map(rowToTrack));
  }

  async saveClips(projectId: string, clips: PersistentStudioClip[]): Promise<ApiResponse<PersistentStudioClip[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    const rows = clips.map((cl) => clipToRow({ ...cl, projectId: projectId as PersistentStudioClip["projectId"] }));
    const { data, error } = await c.from("studio_clips").upsert(rows, { onConflict: "id" }).select("*");
    if (error) return toApiError(error, "CLIPS_SAVE_FAILED");
    return apiSuccess(((data ?? []) as Record<string, unknown>[]).map(rowToClip));
  }

  async commitTimelineRevision(projectId: string, meta: Record<string, unknown>): Promise<ApiResponse<{ revisionId: string }>> {
    const c = this.client();
    if (!c) return notConfigured();
    const proj = await this.getProject(projectId);
    if (!proj.ok) return proj as ApiResponse<{ revisionId: string }>;
    const res = await this.saveProjectSnapshot(projectId, { timelineMeta: meta }, "timeline_revision");
    if (!res.ok) return res as ApiResponse<{ revisionId: string }>;
    return apiSuccess({ revisionId: res.data.id });
  }

  async createMagicReveal(projectId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentMagicReveal>> {
    const c = this.client();
    if (!c) return notConfigured();
    const id = String(payload.id ?? `mr_${Date.now()}`);
    const owner = String(payload.ownerUserId ?? payload.owner_user_id ?? "");
    const merged: PersistentMagicReveal = {
      id: id as PersistentMagicReveal["id"],
      projectId: projectId as PersistentMagicReveal["projectId"],
      ownerUserId: owner as PersistentMagicReveal["ownerUserId"],
      status: String(payload.status ?? "draft"),
      payload,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const row = magicRevealToRow(merged);
    const { data, error } = await c.from("studio_magic_reveals").insert(row).select("*").single();
    if (error) return toApiError(error, "MAGIC_CREATE_FAILED");
    return apiSuccess(rowToMagicReveal(data as Record<string, unknown>));
  }

  async updateMagicReveal(revealId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentMagicReveal>> {
    const c = this.client();
    if (!c) return notConfigured();
    const cur = await c.from("studio_magic_reveals").select("*").eq("id", revealId).maybeSingle();
    if (cur.error) return toApiError(cur.error, "MAGIC_GET_FAILED");
    if (!cur.data) return apiError("NOT_FOUND", "Reveal not found");
    const base = rowToMagicReveal(cur.data as Record<string, unknown>);
    const next: PersistentMagicReveal = {
      ...base,
      payload: { ...base.payload, ...payload },
      updatedAt: new Date().toISOString(),
      version: base.version + 1,
    };
    const row = { ...magicRevealToRow(next), updated_at: next.updatedAt, version: next.version };
    const { data, error } = await c.from("studio_magic_reveals").update(row).eq("id", revealId).select("*").single();
    if (error) return toApiError(error, "MAGIC_UPDATE_FAILED");
    return apiSuccess(rowToMagicReveal(data as Record<string, unknown>));
  }

  async deleteMagicReveal(revealId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { error } = await c.from("studio_magic_reveals").delete().eq("id", revealId);
    if (error) return toApiError(error, "MAGIC_DELETE_FAILED");
    return apiSuccess({ deleted: true });
  }

  async listMagicReveals(projectId: string): Promise<ApiResponse<PersistentMagicReveal[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("studio_magic_reveals").select("*").eq("project_id", projectId);
    if (error) return toApiError(error, "MAGIC_LIST_FAILED");
    return apiSuccess(((data ?? []) as Record<string, unknown>[]).map(rowToMagicReveal));
  }

  runMagicSafetyScan = (_revealId: string) => edgeRequired<{ scanId: string; status: string }>();

  async createExportJob(projectId: string, input: { ownerUserId: string; label: string }): Promise<ApiResponse<PersistentExportJob>> {
    const c = this.client();
    if (!c) return notConfigured();
    const t = new Date().toISOString();
    const row = {
      id: crypto.randomUUID?.() ?? `job_${Date.now()}`,
      project_id: projectId,
      owner_user_id: input.ownerUserId,
      status: "queued",
      payload: { label: input.label },
      created_at: t,
      updated_at: t,
    };
    const { data, error } = await c.from("studio_export_jobs").insert(row).select("*").single();
    if (error) return toApiError(error, "EXPORT_JOB_FAILED");
    const d = data as Record<string, unknown>;
    return apiSuccess({
      id: String(d.id),
      projectId: String(d.project_id) as ProjectId,
      ownerUserId: String(d.owner_user_id) as UserId,
      label: input.label,
      status: String(d.status),
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at),
    });
  }

  async updateExportJob(jobId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentExportJob>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c
      .from("studio_export_jobs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .select("*")
      .single();
    if (error) return toApiError(error, "EXPORT_UPDATE_FAILED");
    const d = data as Record<string, unknown>;
    const pl = (d.payload ?? {}) as Record<string, unknown>;
    return apiSuccess({
      id: String(d.id),
      projectId: String(d.project_id) as ProjectId,
      ownerUserId: String(d.owner_user_id) as UserId,
      label: String(pl.label ?? ""),
      status: String(d.status),
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at),
    });
  }

  async buildPostPackage(
    projectId: string,
    exportJobId: string,
    input: { ownerUserId: string; postPackage: Record<string, unknown> }
  ): Promise<ApiResponse<PersistentPostPackage>> {
    const c = this.client();
    if (!c) return notConfigured();
    const id = crypto.randomUUID?.() ?? `pkg_${Date.now()}`;
    const hash = cheapHash(JSON.stringify(input.postPackage));
    const row = postPackageToRow(input.postPackage, projectId, exportJobId, input.ownerUserId, id, hash);
    const { data, error } = await c.from("post_packages").insert(row).select("*").single();
    if (error) return toApiError(error, "POST_PACKAGE_FAILED");
    return apiSuccess(rowToPostPackage(data as Record<string, unknown>));
  }

  publishPost = (_packageId: string, _input: Record<string, unknown>) => serverAuthority<PersistentPublishedPost>();

  async getPublishedPost(postId: string): Promise<ApiResponse<PersistentPublishedPost>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("published_posts").select("*").eq("id", postId).maybeSingle();
    if (error) return toApiError(error, "PUBLISHED_GET_FAILED");
    if (!data) return apiError("NOT_FOUND", "Post not found");
    const d = data as Record<string, unknown>;
    const meta = (d.meta ?? {}) as Record<string, unknown>;
    return apiSuccess({
      id: String(d.id) as PersistentPublishedPost["id"],
      packageId: String(d.package_id),
      creatorUserId: String(d.owner_user_id) as UserId,
      status: String(d.status),
      postPackageSnapshot: meta,
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at),
    });
  }

  async listPublishedPosts(projectId?: string): Promise<ApiResponse<PersistentPublishedPost[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    let q = c.from("published_posts").select("*");
    if (projectId) q = q.eq("project_id", projectId);
    const { data, error } = await q;
    if (error) return toApiError(error, "PUBLISHED_LIST_FAILED");
    const rows = (data ?? []) as Record<string, unknown>[];
    return apiSuccess(
      rows.map((d) => ({
        id: String(d.id) as PersistentPublishedPost["id"],
        packageId: String(d.package_id),
        creatorUserId: String(d.owner_user_id) as UserId,
        status: String(d.status),
        postPackageSnapshot: (d.meta ?? {}) as Record<string, unknown>,
        createdAt: String(d.created_at),
        updatedAt: String(d.updated_at),
      }))
    );
  }

  async getWalletAccount(id: string): Promise<ApiResponse<PersistentWalletAccount>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("wallet_accounts").select("*").eq("id", id).maybeSingle();
    if (error) return toApiError(error, "WALLET_GET_FAILED");
    if (!data) return apiError("NOT_FOUND", "Wallet account not found");
    const d = data as Record<string, unknown>;
    return apiSuccess({
      id: String(d.id) as PersistentWalletAccount["id"],
      ownerUserId: String(d.owner_user_id) as UserId,
      type: "wallet",
      status: String(d.status),
      payload: (d.meta ?? {}) as Record<string, unknown>,
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at),
    });
  }

  async listWalletAccounts(ownerUserId?: string): Promise<ApiResponse<PersistentWalletAccount[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    let q = c.from("wallet_accounts").select("*");
    if (ownerUserId) q = q.eq("owner_user_id", ownerUserId);
    const { data, error } = await q;
    if (error) return toApiError(error, "WALLET_LIST_FAILED");
    const rows = (data ?? []) as Record<string, unknown>[];
    return apiSuccess(
      rows.map((d) => ({
        id: String(d.id) as PersistentWalletAccount["id"],
        ownerUserId: String(d.owner_user_id) as UserId,
        type: "wallet",
        status: String(d.status),
        payload: (d.meta ?? {}) as Record<string, unknown>,
        createdAt: String(d.created_at),
        updatedAt: String(d.updated_at),
      }))
    );
  }

  createLedgerEntries = (_entries: PersistentLedgerEntry[]) => serverAuthority<PersistentLedgerEntry[]>();
  listLedgerEntries = async (filter?: { projectId?: string; postId?: string }): Promise<ApiResponse<PersistentLedgerEntry[]>> => {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("wallet_ledger_entries").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) return toApiError(error, "LEDGER_LIST_FAILED");
    let rows = (data ?? []) as Record<string, unknown>[];
    const metaPost = (r: Record<string, unknown>) => String((asRecord(r.meta).postId as string | undefined) ?? "");
    if (filter?.postId) rows = rows.filter((r) => metaPost(r) === filter.postId);
    if (filter?.projectId) rows = rows.filter((r) => String(asRecord(r.meta).projectId ?? "") === filter.projectId);
    return apiSuccess(
      rows.map((d) => ({
        id: String(d.id) as PersistentLedgerEntry["id"],
        walletAccountId: d.account_id ? (String(d.account_id) as PersistentLedgerEntry["walletAccountId"]) : undefined,
        projectId: (asRecord(d.meta).projectId as PersistentLedgerEntry["projectId"] | undefined) ?? undefined,
        postId: (asRecord(d.meta).postId as PersistentLedgerEntry["postId"] | undefined) ?? undefined,
        status: "completed" as const,
        payload: {
          kind: d.kind,
          amount_minor: d.amount_minor,
          currency: d.currency,
          direction: d.direction,
          meta: d.meta,
        } as Record<string, unknown>,
        createdAt: String(d.created_at),
      }))
    );
  };

  getLedgerEntriesForUnlock = (_unlockId: string) => serverAuthority<PersistentLedgerEntry[]>();
  releaseSettlement = (_unlockId: string) => serverAuthority<{ released: boolean }>();
  reverseSettlement = (_unlockId: string) => serverAuthority<{ reversed: boolean }>();

  async createCampaign(projectId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentCampaign>> {
    const c = this.client();
    if (!c) return notConfigured();
    const id = String(input.id ?? `campaign_${projectId}`);
    const owner = String(input.ownerUserId ?? input.owner_user_id ?? "");
    const camp: PersistentCampaign = {
      id: id as PersistentCampaign["id"],
      projectId: projectId as PersistentCampaign["projectId"],
      ownerUserId: owner as PersistentCampaign["ownerUserId"],
      status: String(input.status ?? "draft"),
      monetization: (input.monetization as Record<string, unknown>) ?? {},
      monetizationMode: String(input.monetizationMode ?? "off"),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const row = campaignToRow(camp);
    const { data, error } = await c.from("campaigns").insert(row).select("*").single();
    if (error) return toApiError(error, "CAMPAIGN_CREATE_FAILED");
    return apiSuccess(rowToCampaign(data as Record<string, unknown>));
  }

  async updateCampaign(campaignId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentCampaign>> {
    const c = this.client();
    if (!c) return notConfigured();
    const cur = await c.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
    if (cur.error || !cur.data) return apiError("NOT_FOUND", "Campaign not found");
    const base = rowToCampaign(cur.data as Record<string, unknown>);
    const next: PersistentCampaign = {
      ...base,
      monetization: (patch.monetization as Record<string, unknown>) ?? base.monetization,
      monetizationMode: String(patch.monetizationMode ?? base.monetizationMode),
      status: String(patch.status ?? base.status),
      updatedAt: new Date().toISOString(),
    };
    const row = { ...campaignToRow(next), updated_at: next.updatedAt };
    const { data, error } = await c.from("campaigns").update(row).eq("id", campaignId).select("*").single();
    if (error) return toApiError(error, "CAMPAIGN_UPDATE_FAILED");
    return apiSuccess(rowToCampaign(data as Record<string, unknown>));
  }

  async listCampaigns(projectId: string): Promise<ApiResponse<PersistentCampaign[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("campaigns").select("*");
    if (error) return toApiError(error, "CAMPAIGN_LIST_FAILED");
    const rows = ((data ?? []) as Record<string, unknown>[]).map(rowToCampaign).filter((x) => x.projectId === projectId);
    return apiSuccess(rows);
  }

  async recordCampaignActionAttempt(
    campaignId: string,
    payload: Record<string, unknown>
  ): Promise<ApiResponse<PersistentCampaignActionAttempt>> {
    const c = this.client();
    if (!c) return notConfigured();
    const t = new Date().toISOString();
    const row = {
      id: crypto.randomUUID?.() ?? `att_${Date.now()}`,
      campaign_id: campaignId,
      actor_user_id: payload.actorUserId ?? null,
      action_kind: String(payload.actionKind ?? payload.action_kind ?? "unknown"),
      payload,
      created_at: t,
    };
    const { data, error } = await c.from("campaign_action_attempts").insert(row).select("*").single();
    if (error) return toApiError(error, "CAMPAIGN_ATTEMPT_FAILED");
    const d = data as Record<string, unknown>;
    const pl = (d.payload ?? {}) as Record<string, unknown>;
    return apiSuccess({
      id: String(d.id),
      campaignId: String(d.campaign_id) as PersistentCampaignActionAttempt["campaignId"],
      projectId: String(pl.projectId ?? "") as PersistentCampaignActionAttempt["projectId"],
      status: String(pl.status ?? "recorded"),
      payload: pl,
      createdAt: String(d.created_at),
      updatedAt: String(d.created_at),
    });
  }

  async updateCampaignActionAttempt(attemptId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentCampaignActionAttempt>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("campaign_action_attempts").update({ payload: patch }).eq("id", attemptId).select("*").single();
    if (error) return toApiError(error, "CAMPAIGN_ATTEMPT_UPDATE_FAILED");
    const d = data as Record<string, unknown>;
    const pl = (d.payload ?? {}) as Record<string, unknown>;
    return apiSuccess({
      id: String(d.id),
      campaignId: String(d.campaign_id) as PersistentCampaignActionAttempt["campaignId"],
      projectId: String(pl.projectId ?? "") as PersistentCampaignActionAttempt["projectId"],
      status: String(pl.status ?? "updated"),
      payload: pl,
      createdAt: String(d.created_at),
      updatedAt: String(d.created_at),
    });
  }

  createVerificationRecord = (_payload: Record<string, unknown>) => serverAuthority<PersistentVerificationRecord>();
  updateVerificationRecord = (_id: string, _patch: Record<string, unknown>) => serverAuthority<PersistentVerificationRecord>();
  createFraudAssessment = (_payload: Record<string, unknown>) => serverAuthority<PersistentFraudAssessment>();
  createPOPSChallenge = (_payload: Record<string, unknown>) => serverAuthority<PersistentPOPSChallenge>();
  updatePOPSChallenge = (_id: string, _patch: Record<string, unknown>) => serverAuthority<PersistentPOPSChallenge>();

  async createDispute(payload: Record<string, unknown>): Promise<ApiResponse<PersistentDispute>> {
    const c = this.client();
    if (!c) return notConfigured();
    const t = new Date().toISOString();
    const row = {
      id: crypto.randomUUID?.() ?? `dsp_${Date.now()}`,
      opener_user_id: String(payload.openerUserId ?? payload.ownerUserId ?? payload.owner_user_id ?? ""),
      subject_type: String(payload.subjectType ?? "unknown"),
      subject_id: String(payload.subjectId ?? payload.subject_id ?? crypto.randomUUID?.()),
      status: "open",
      resolution: null,
      payload,
      created_at: t,
      updated_at: t,
    };
    const { data, error } = await c.from("disputes").insert(row).select("*").single();
    if (error) return toApiError(error, "DISPUTE_CREATE_FAILED");
    const d = data as Record<string, unknown>;
    return apiSuccess({
      id: String(d.id) as PersistentDispute["id"],
      status: String(d.status),
      payload: (d.payload ?? {}) as Record<string, unknown>,
      createdAt: String(d.created_at),
      updatedAt: String(d.updated_at),
    });
  }

  addDisputeEvidence = (_disputeId: string, _evidence: Record<string, unknown>) =>
    serverAuthority<{ id: string }>("Append dispute evidence via Edge or RLS-safe insert path.");
  updateDispute = (_disputeId: string, _patch: Record<string, unknown>) => serverAuthority<PersistentDispute>();

  async listDisputes(filter?: { projectId?: string }): Promise<ApiResponse<PersistentDispute[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("disputes").select("*").limit(100);
    if (error) return toApiError(error, "DISPUTE_LIST_FAILED");
    let rows = (data ?? []) as Record<string, unknown>[];
    if (filter?.projectId) {
      rows = rows.filter((d) => String((d.payload as Record<string, unknown>)?.projectId ?? "") === filter.projectId);
    }
    return apiSuccess(
      rows.map((d) => ({
        id: String(d.id) as PersistentDispute["id"],
        status: String(d.status),
        payload: (d.payload ?? {}) as Record<string, unknown>,
        createdAt: String(d.created_at),
        updatedAt: String(d.updated_at),
      }))
    );
  }

  createViewerSession = (_postId: string, _payload: Record<string, unknown>) => serverAuthority<PersistentViewerSession>();
  updateViewerSession = (_sessionId: string, _patch: Record<string, unknown>) => serverAuthority<PersistentViewerSession>();
  recordRuntimeEvent = (_postId: string, _payload: Record<string, unknown>) => serverAuthority<PersistentRuntimeEvent>();

  async listRuntimeEvents(postId: string): Promise<ApiResponse<PersistentRuntimeEvent[]>> {
    const c = this.client();
    if (!c) return notConfigured();
    const { data, error } = await c.from("runtime_events").select("*").eq("post_id", postId).limit(200);
    if (error) return toApiError(error, "RUNTIME_LIST_FAILED");
    const rows = (data ?? []) as Record<string, unknown>[];
    return apiSuccess(
      rows.map((d) => ({
        id: String(d.id) as PersistentRuntimeEvent["id"],
        postId: String(d.post_id ?? "") as PersistentRuntimeEvent["postId"],
        type: String(d.event_type ?? "event"),
        payload: (d.payload ?? {}) as Record<string, unknown>,
        createdAt: String(d.created_at),
      }))
    );
  }

  getCreatorPostAnalytics = () => Promise.resolve(apiError("NOT_IMPLEMENTED", "Analytics warehouse not wired in Stage 9."));
  getCampaignAnalytics = () => Promise.resolve(apiError("NOT_IMPLEMENTED", "Analytics warehouse not wired in Stage 9."));
  getMagicRevealAnalytics = () => Promise.resolve(apiError("NOT_IMPLEMENTED", "Analytics warehouse not wired in Stage 9."));
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
