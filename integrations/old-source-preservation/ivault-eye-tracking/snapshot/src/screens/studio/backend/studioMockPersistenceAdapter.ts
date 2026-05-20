/**
 * [ i ] Studio Stage 8 — in-memory persistence for demos (clone-on-read/write, optional latency, idempotency).
 */

// MOCK / DEMO STUDIO DATA
// This module is demo/mock-only and not an authoritative backend source of truth.
// Do not use as the final writer for economy, rewards, wallet, trust, fraud, or settlement decisions.
// Backend/API + DB event flows remain authoritative per ownership contract.

import { apiError, apiSuccess, type ApiResponse } from "./studioApiTypes";
import type { StudioPersistenceAdapter } from "./studioPersistenceAdapter";
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

export interface MockPersistenceOptions {
  simulateDelayMs?: number;
}

function nowIso() {
  return new Date().toISOString();
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export type MockSnapshot = Record<string, unknown>;

export class StudioMockPersistenceAdapter implements StudioPersistenceAdapter {
  readonly projects = new Map<string, PersistentStudioProject>();
  readonly assets = new Map<string, PersistentStudioAsset>();
  readonly tracks = new Map<string, PersistentStudioTrack>();
  readonly clips = new Map<string, PersistentStudioClip>();
  readonly magicReveals = new Map<string, PersistentMagicReveal>();
  readonly postPackages = new Map<string, PersistentPostPackage>();
  readonly publishedPosts = new Map<string, PersistentPublishedPost>();
  readonly campaigns = new Map<string, PersistentCampaign>();
  readonly campaignAttempts = new Map<string, PersistentCampaignActionAttempt>();
  readonly walletAccounts = new Map<string, PersistentWalletAccount>();
  readonly ledgerEntries = new Map<string, PersistentLedgerEntry>();
  readonly verificationRecords = new Map<string, PersistentVerificationRecord>();
  readonly fraudAssessments = new Map<string, PersistentFraudAssessment>();
  readonly popsChallenges = new Map<string, PersistentPOPSChallenge>();
  readonly disputes = new Map<string, PersistentDispute>();
  readonly disputeEvidence = new Map<string, { id: string; disputeId: string; payload: Record<string, unknown>; createdAt: string }>();
  readonly runtimeEvents = new Map<string, PersistentRuntimeEvent>();
  readonly viewerSessions = new Map<string, PersistentViewerSession>();
  readonly exportJobs = new Map<string, PersistentExportJob>();
  readonly projectSnapshots = new Map<string, Array<{ id: string; projectId: string; snapshot: Record<string, unknown>; label?: string; createdAt: string }>>();
  private readonly idempotency = new Map<string, ApiResponse<unknown>>();
  private readonly opts: MockPersistenceOptions;

  constructor(opts: MockPersistenceOptions = {}) {
    this.opts = opts;
  }

  private async delay<T>(p: Promise<T>): Promise<T> {
    const ms = this.opts.simulateDelayMs ?? 0;
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    return p;
  }

  private idemKey(op: string, key: string) {
    return `${op}::${key}`;
  }

  getEntityCounts(): Record<string, number> {
    return {
      projects: this.projects.size,
      assets: this.assets.size,
      tracks: this.tracks.size,
      clips: this.clips.size,
      magicReveals: this.magicReveals.size,
      postPackages: this.postPackages.size,
      publishedPosts: this.publishedPosts.size,
      campaigns: this.campaigns.size,
      walletAccounts: this.walletAccounts.size,
      ledgerEntries: this.ledgerEntries.size,
      verificationRecords: this.verificationRecords.size,
      fraudAssessments: this.fraudAssessments.size,
      popsChallenges: this.popsChallenges.size,
      disputes: this.disputes.size,
      runtimeEvents: this.runtimeEvents.size,
      viewerSessions: this.viewerSessions.size,
      exportJobs: this.exportJobs.size,
    };
  }

  clearAll(): void {
    this.projects.clear();
    this.assets.clear();
    this.tracks.clear();
    this.clips.clear();
    this.magicReveals.clear();
    this.postPackages.clear();
    this.publishedPosts.clear();
    this.campaigns.clear();
    this.campaignAttempts.clear();
    this.walletAccounts.clear();
    this.ledgerEntries.clear();
    this.verificationRecords.clear();
    this.fraudAssessments.clear();
    this.popsChallenges.clear();
    this.disputes.clear();
    this.disputeEvidence.clear();
    this.runtimeEvents.clear();
    this.viewerSessions.clear();
    this.exportJobs.clear();
    this.projectSnapshots.clear();
    this.idempotency.clear();
  }

  exportSnapshot(): MockSnapshot {
    return {
      projects: [...this.projects.entries()],
      assets: [...this.assets.entries()],
      tracks: [...this.tracks.entries()],
      clips: [...this.clips.entries()],
      magicReveals: [...this.magicReveals.entries()],
      postPackages: [...this.postPackages.entries()],
      publishedPosts: [...this.publishedPosts.entries()],
      campaigns: [...this.campaigns.entries()],
      ledgerEntries: [...this.ledgerEntries.entries()],
      verificationRecords: [...this.verificationRecords.entries()],
      disputes: [...this.disputes.entries()],
      runtimeEvents: [...this.runtimeEvents.entries()],
      exportJobs: [...this.exportJobs.entries()],
    };
  }

  importSnapshot(raw: MockSnapshot): void {
    this.clearAll();
    const restore = <K, V>(m: Map<K, V>, pairs: unknown) => {
      if (!Array.isArray(pairs)) return;
      for (const row of pairs) {
        if (Array.isArray(row) && row.length === 2) m.set(row[0] as K, clone(row[1]) as V);
      }
    };
    restore(this.projects, raw.projects);
    restore(this.assets, raw.assets);
    restore(this.tracks, raw.tracks);
    restore(this.clips, raw.clips);
    restore(this.magicReveals, raw.magicReveals);
    restore(this.postPackages, raw.postPackages);
    restore(this.publishedPosts, raw.publishedPosts);
    restore(this.campaigns, raw.campaigns);
    restore(this.ledgerEntries, raw.ledgerEntries);
    restore(this.verificationRecords, raw.verificationRecords);
    restore(this.disputes, raw.disputes);
    restore(this.runtimeEvents, raw.runtimeEvents);
    restore(this.exportJobs, raw.exportJobs);
  }

  async createProject(input: {
    id: string;
    ownerUserId: string;
    title: string;
    draftPayload: Record<string, unknown>;
    status: string;
  }): Promise<ApiResponse<PersistentStudioProject>> {
    return this.delay(
      (async () => {
        const ik = this.idemKey("createProject", input.id);
        const prev = this.idempotency.get(ik);
        if (prev?.ok) return prev as ApiResponse<PersistentStudioProject>;
        const t = nowIso();
        const row: PersistentStudioProject = {
          id: input.id as PersistentStudioProject["id"],
          ownerUserId: input.ownerUserId as PersistentStudioProject["ownerUserId"],
          title: input.title,
          status: input.status,
          draftPayload: clone(input.draftPayload),
          version: 1,
          createdAt: t,
          updatedAt: t,
        };
        this.projects.set(input.id, row);
        const res = apiSuccess(clone(row));
        this.idempotency.set(ik, res);
        return res;
      })()
    );
  }

  async getProject(projectId: string): Promise<ApiResponse<PersistentStudioProject>> {
    return this.delay(
      (async () => {
        const p = this.projects.get(projectId);
        if (!p) return apiError("NOT_FOUND", "Project not found", { projectId });
        return apiSuccess(clone(p));
      })()
    );
  }

  async updateProject(
    projectId: string,
    patch: Partial<Pick<PersistentStudioProject, "title" | "draftPayload" | "status">>
  ): Promise<ApiResponse<PersistentStudioProject>> {
    return this.delay(
      (async () => {
        const p = this.projects.get(projectId);
        if (!p) return apiError("NOT_FOUND", "Project not found", { projectId });
        const next: PersistentStudioProject = {
          ...p,
          ...patch,
          draftPayload: patch.draftPayload ? clone(patch.draftPayload) : p.draftPayload,
          version: p.version + 1,
          updatedAt: nowIso(),
        };
        this.projects.set(projectId, next);
        return apiSuccess(clone(next));
      })()
    );
  }

  async saveProjectSnapshot(projectId: string, snapshot: Record<string, unknown>, label?: string): Promise<ApiResponse<{ id: string }>> {
    const id = genId("snap");
    const arr = this.projectSnapshots.get(projectId) ?? [];
    arr.push({ id, projectId, snapshot: clone(snapshot), label, createdAt: nowIso() });
    this.projectSnapshots.set(projectId, arr);
    return this.delay(Promise.resolve(apiSuccess({ id })));
  }

  async listProjects(ownerUserId?: string): Promise<ApiResponse<PersistentStudioProject[]>> {
    const all = [...this.projects.values()].map(clone);
    const filtered = ownerUserId ? all.filter((p) => (p.ownerUserId as unknown as string) === ownerUserId) : all;
    return this.delay(Promise.resolve(apiSuccess(filtered)));
  }

  async archiveProject(projectId: string): Promise<ApiResponse<PersistentStudioProject>> {
    return this.updateProject(projectId, { status: "archived" });
  }

  async deleteProject(projectId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const p = this.projects.get(projectId);
    if (!p) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Project not found")));
    this.projects.set(projectId, { ...p, deletedAt: nowIso(), status: "deleted", updatedAt: nowIso() });
    return this.delay(Promise.resolve(apiSuccess({ deleted: true })));
  }

  async createAsset(projectId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentStudioAsset>> {
    const id = (input.id as string) || genId("asset");
    const t = nowIso();
    const row: PersistentStudioAsset = {
      id: id as PersistentStudioAsset["id"],
      projectId: projectId as PersistentStudioAsset["projectId"],
      ownerUserId: (input.ownerUserId as string) as PersistentStudioAsset["ownerUserId"],
      uri: input.uri as string | undefined,
      status: "pending",
      payload: clone(input),
      version: 1,
      createdAt: t,
      updatedAt: t,
    };
    this.assets.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async confirmAsset(assetId: string): Promise<ApiResponse<PersistentStudioAsset>> {
    const a = this.assets.get(assetId);
    if (!a) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Asset not found")));
    const next = { ...a, status: "confirmed", updatedAt: nowIso() };
    this.assets.set(assetId, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async getAsset(assetId: string): Promise<ApiResponse<PersistentStudioAsset>> {
    const a = this.assets.get(assetId);
    if (!a) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Asset not found")));
    return this.delay(Promise.resolve(apiSuccess(clone(a))));
  }

  async listAssets(projectId: string): Promise<ApiResponse<PersistentStudioAsset[]>> {
    const list = [...this.assets.values()].filter((a) => (a.projectId as unknown as string) === projectId).map(clone);
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async deleteAsset(assetId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const a = this.assets.get(assetId);
    if (!a) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Asset not found")));
    this.assets.set(assetId, { ...a, status: "deleted", deletedAt: nowIso(), updatedAt: nowIso() });
    return this.delay(Promise.resolve(apiSuccess({ deleted: true })));
  }

  async saveTracks(projectId: string, tracks: PersistentStudioTrack[]): Promise<ApiResponse<PersistentStudioTrack[]>> {
    for (const k of [...this.tracks.keys()]) {
      const tr = this.tracks.get(k)!;
      if ((tr.projectId as unknown as string) === projectId) this.tracks.delete(k);
    }
    const saved = tracks.map((tr) => {
      const c = clone(tr);
      this.tracks.set(tr.id as unknown as string, c);
      return c;
    });
    return this.delay(Promise.resolve(apiSuccess(saved.map(clone))));
  }

  async saveClips(projectId: string, clips: PersistentStudioClip[]): Promise<ApiResponse<PersistentStudioClip[]>> {
    for (const k of [...this.clips.keys()]) {
      const cl = this.clips.get(k)!;
      if ((cl.projectId as unknown as string) === projectId) this.clips.delete(k);
    }
    const saved = clips.map((cl) => {
      const c = clone(cl);
      this.clips.set(cl.id as unknown as string, c);
      return c;
    });
    return this.delay(Promise.resolve(apiSuccess(saved.map(clone))));
  }

  async commitTimelineRevision(projectId: string, meta: Record<string, unknown>): Promise<ApiResponse<{ revisionId: string }>> {
    return this.delay(Promise.resolve(apiSuccess({ revisionId: genId(`rev_${projectId}`) })));
  }

  async createMagicReveal(projectId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentMagicReveal>> {
    const id = (payload.id as string) || genId("magic");
    const t = nowIso();
    const row: PersistentMagicReveal = {
      id: id as PersistentMagicReveal["id"],
      projectId: projectId as PersistentMagicReveal["projectId"],
      ownerUserId: (payload.ownerUserId as string) as PersistentMagicReveal["ownerUserId"],
      status: "draft",
      payload: clone(payload),
      version: 1,
      createdAt: t,
      updatedAt: t,
    };
    this.magicReveals.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async updateMagicReveal(revealId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentMagicReveal>> {
    const m = this.magicReveals.get(revealId);
    if (!m) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Magic reveal not found")));
    const next: PersistentMagicReveal = {
      ...m,
      payload: { ...m.payload, ...clone(payload) },
      version: m.version + 1,
      updatedAt: nowIso(),
    };
    this.magicReveals.set(revealId, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async deleteMagicReveal(revealId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const m = this.magicReveals.get(revealId);
    if (!m) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Magic reveal not found")));
    this.magicReveals.set(revealId, { ...m, deletedAt: nowIso(), status: "deleted", updatedAt: nowIso() });
    return this.delay(Promise.resolve(apiSuccess({ deleted: true })));
  }

  async listMagicReveals(projectId: string): Promise<ApiResponse<PersistentMagicReveal[]>> {
    const list = [...this.magicReveals.values()].filter((m) => (m.projectId as unknown as string) === projectId && !m.deletedAt).map(clone);
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async runMagicSafetyScan(revealId: string): Promise<ApiResponse<{ scanId: string; status: string }>> {
    if (!this.magicReveals.has(revealId)) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Magic reveal not found")));
    return this.delay(Promise.resolve(apiSuccess({ scanId: genId("scan"), status: "mock_pass" })));
  }

  async createExportJob(projectId: string, input: { ownerUserId: string; label: string }): Promise<ApiResponse<PersistentExportJob>> {
    const id = genId("export");
    const t = nowIso();
    const row: PersistentExportJob = {
      id,
      projectId: projectId as PersistentExportJob["projectId"],
      ownerUserId: input.ownerUserId as PersistentExportJob["ownerUserId"],
      label: input.label,
      status: "queued",
      createdAt: t,
      updatedAt: t,
    };
    this.exportJobs.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async updateExportJob(jobId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentExportJob>> {
    const j = this.exportJobs.get(jobId);
    if (!j) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Export job not found")));
    const next = { ...j, ...patch, updatedAt: nowIso() } as PersistentExportJob;
    this.exportJobs.set(jobId, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async buildPostPackage(
    projectId: string,
    exportJobId: string,
    input: { ownerUserId: string; postPackage: Record<string, unknown> }
  ): Promise<ApiResponse<PersistentPostPackage>> {
    const id = (input.postPackage.id as string) || genId("pkg");
    const t = nowIso();
    const row: PersistentPostPackage = {
      id,
      projectId: projectId as PersistentPostPackage["projectId"],
      exportJobId,
      ownerUserId: input.ownerUserId as PersistentPostPackage["ownerUserId"],
      packagePayload: clone(input.postPackage),
      contentHash: `mock_sha256_${id.slice(-8)}`,
      createdAt: t,
      updatedAt: t,
    };
    this.postPackages.set(id, row);
    await this.updateExportJob(exportJobId, { status: "completed" });
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async publishPost(packageId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentPublishedPost>> {
    const pkg = this.postPackages.get(packageId);
    if (!pkg) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Post package not found")));
    const postId = genId("post");
    const t = nowIso();
    const row: PersistentPublishedPost = {
      id: postId as PersistentPublishedPost["id"],
      packageId,
      creatorUserId: pkg.ownerUserId,
      status: "live",
      postPackageSnapshot: clone(pkg.packagePayload),
      createdAt: t,
      updatedAt: t,
    };
    this.publishedPosts.set(postId, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async getPublishedPost(postId: string): Promise<ApiResponse<PersistentPublishedPost>> {
    const p = this.publishedPosts.get(postId);
    if (!p) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Published post not found")));
    return this.delay(Promise.resolve(apiSuccess(clone(p))));
  }

  async listPublishedPosts(projectId?: string): Promise<ApiResponse<PersistentPublishedPost[]>> {
    let list = [...this.publishedPosts.values()].map(clone);
    if (projectId) {
      list = list.filter((p) => {
        const snap = p.postPackageSnapshot as { sourceProjectId?: string };
        return snap?.sourceProjectId === projectId;
      });
    }
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async getWalletAccount(id: string): Promise<ApiResponse<PersistentWalletAccount>> {
    const w = this.walletAccounts.get(id);
    if (!w) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Wallet account not found")));
    return this.delay(Promise.resolve(apiSuccess(clone(w))));
  }

  async listWalletAccounts(): Promise<ApiResponse<PersistentWalletAccount[]>> {
    return this.delay(Promise.resolve(apiSuccess([...this.walletAccounts.values()].map(clone))));
  }

  async createLedgerEntries(entries: PersistentLedgerEntry[]): Promise<ApiResponse<PersistentLedgerEntry[]>> {
    return this.delay(
      (async () => {
        if (entries.some((e) => e.status === "completed")) {
          return apiError(
            "SERVER_AUTHORITY_REQUIRED",
            "Completed ledger lines are not client-created; use settlement worker.",
            { hint: "DO_NOT_UPDATE ledger entries after creation; reverse with compensating entry." }
          );
        }
        const ik = this.idemKey(
          "ledger",
          entries
            .map((e) => e.id as string)
            .sort()
            .join("|")
        );
        const prev = this.idempotency.get(ik);
        if (prev?.ok) return prev as ApiResponse<PersistentLedgerEntry[]>;
        const saved: PersistentLedgerEntry[] = [];
        for (const e of entries) {
          const row = clone(e);
          this.ledgerEntries.set(e.id as unknown as string, row);
          saved.push(clone(row));
        }
        const res = apiSuccess(saved);
        this.idempotency.set(ik, res);
        return res;
      })()
    );
  }

  async listLedgerEntries(filter?: { projectId?: string; postId?: string }): Promise<ApiResponse<PersistentLedgerEntry[]>> {
    let list = [...this.ledgerEntries.values()].map(clone);
    if (filter?.projectId) list = list.filter((e) => (e.projectId as unknown as string) === filter.projectId);
    if (filter?.postId) list = list.filter((e) => (e.postId as unknown as string) === filter.postId);
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async getLedgerEntriesForUnlock(unlockId: string): Promise<ApiResponse<PersistentLedgerEntry[]>> {
    const list = [...this.ledgerEntries.values()]
      .filter((e) => {
        const p = e.payload as { unlockId?: string };
        return p.unlockId === unlockId;
      })
      .map(clone);
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async releaseSettlement(unlockId: string): Promise<ApiResponse<{ released: boolean }>> {
    return this.delay(Promise.resolve(apiSuccess({ released: true }, { unlockId })));
  }

  async reverseSettlement(unlockId: string): Promise<ApiResponse<{ reversed: boolean }>> {
    return this.delay(Promise.resolve(apiSuccess({ reversed: true }, { unlockId })));
  }

  async createCampaign(projectId: string, input: Record<string, unknown>): Promise<ApiResponse<PersistentCampaign>> {
    const id = (input.id as string) || genId("campaign");
    const t = nowIso();
    const row: PersistentCampaign = {
      id: id as PersistentCampaign["id"],
      projectId: projectId as PersistentCampaign["projectId"],
      ownerUserId: (input.ownerUserId as string) as PersistentCampaign["ownerUserId"],
      status: "draft",
      monetization: clone((input.monetization as Record<string, unknown>) ?? {}),
      monetizationMode: String(input.monetizationMode ?? "off"),
      version: 1,
      createdAt: t,
      updatedAt: t,
    };
    this.campaigns.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async updateCampaign(campaignId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentCampaign>> {
    const c = this.campaigns.get(campaignId);
    if (!c) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Campaign not found")));
    const next: PersistentCampaign = {
      ...c,
      ...patch,
      monetization: patch.monetization ? clone(patch.monetization as Record<string, unknown>) : c.monetization,
      version: c.version + 1,
      updatedAt: nowIso(),
    };
    this.campaigns.set(campaignId, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async listCampaigns(projectId: string): Promise<ApiResponse<PersistentCampaign[]>> {
    const list = [...this.campaigns.values()].filter((c) => (c.projectId as unknown as string) === projectId).map(clone);
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async recordCampaignActionAttempt(campaignId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentCampaignActionAttempt>> {
    const id = genId("caa");
    const t = nowIso();
    const row: PersistentCampaignActionAttempt = {
      id,
      campaignId: campaignId as PersistentCampaignActionAttempt["campaignId"],
      projectId: (payload.projectId as string) as PersistentCampaignActionAttempt["projectId"],
      status: "recorded",
      payload: clone(payload),
      createdAt: t,
      updatedAt: t,
    };
    this.campaignAttempts.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async updateCampaignActionAttempt(attemptId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentCampaignActionAttempt>> {
    const a = this.campaignAttempts.get(attemptId);
    if (!a) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Attempt not found")));
    const next = { ...a, ...patch, payload: { ...a.payload, ...clone(patch) }, updatedAt: nowIso() } as PersistentCampaignActionAttempt;
    this.campaignAttempts.set(attemptId, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async createVerificationRecord(payload: Record<string, unknown>): Promise<ApiResponse<PersistentVerificationRecord>> {
    const id = (payload.id as string) || genId("ver");
    const t = nowIso();
    const row: PersistentVerificationRecord = {
      id: id as PersistentVerificationRecord["id"],
      projectId: payload.projectId as PersistentVerificationRecord["projectId"],
      postId: payload.postId as PersistentVerificationRecord["postId"],
      status: "open",
      payload: clone(payload),
      createdAt: t,
    };
    this.verificationRecords.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async updateVerificationRecord(id: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentVerificationRecord>> {
    const v = this.verificationRecords.get(id);
    if (!v) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Verification record not found")));
    if (v.completedAt) return this.delay(Promise.resolve(apiError("IMMUTABLE", "Completed verification records are sealed")));
    const next: PersistentVerificationRecord = {
      ...v,
      ...patch,
      payload: { ...v.payload, ...clone(patch) },
      updatedAt: nowIso(),
    };
    this.verificationRecords.set(id, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async createFraudAssessment(payload: Record<string, unknown>): Promise<ApiResponse<PersistentFraudAssessment>> {
    const id = genId("fraud");
    const row: PersistentFraudAssessment = { id, verificationId: payload.verificationId as PersistentFraudAssessment["verificationId"], status: "mock", payload: clone(payload), createdAt: nowIso() };
    this.fraudAssessments.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async createPOPSChallenge(payload: Record<string, unknown>): Promise<ApiResponse<PersistentPOPSChallenge>> {
    const id = genId("pops");
    const t = nowIso();
    const row: PersistentPOPSChallenge = {
      id,
      verificationId: payload.verificationId as PersistentPOPSChallenge["verificationId"],
      status: "issued",
      payload: clone(payload),
      createdAt: t,
      updatedAt: t,
    };
    this.popsChallenges.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async updatePOPSChallenge(id: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentPOPSChallenge>> {
    const p = this.popsChallenges.get(id);
    if (!p) return this.delay(Promise.resolve(apiError("NOT_FOUND", "POPS challenge not found")));
    const next = { ...p, ...patch, payload: { ...p.payload, ...clone(patch) }, updatedAt: nowIso() };
    this.popsChallenges.set(id, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async createDispute(payload: Record<string, unknown>): Promise<ApiResponse<PersistentDispute>> {
    const id = (payload.id as string) || genId("dispute");
    const t = nowIso();
    const row: PersistentDispute = { id: id as PersistentDispute["id"], status: "open", payload: clone(payload), createdAt: t, updatedAt: t };
    this.disputes.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async addDisputeEvidence(disputeId: string, evidence: Record<string, unknown>): Promise<ApiResponse<{ id: string }>> {
    const id = genId("evidence");
    this.disputeEvidence.set(id, { id, disputeId: disputeId as PersistentDispute["id"], payload: clone(evidence), createdAt: nowIso() });
    return this.delay(Promise.resolve(apiSuccess({ id })));
  }

  async updateDispute(disputeId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentDispute>> {
    const d = this.disputes.get(disputeId);
    if (!d) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Dispute not found")));
    const next = { ...d, ...patch, updatedAt: nowIso() } as PersistentDispute;
    this.disputes.set(disputeId, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async listDisputes(filter?: { projectId?: string }): Promise<ApiResponse<PersistentDispute[]>> {
    let list = [...this.disputes.values()].map(clone);
    if (filter?.projectId) list = list.filter((d) => (d.payload as { projectId?: string }).projectId === filter.projectId);
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async createViewerSession(postId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentViewerSession>> {
    const id = genId("sess");
    const t = nowIso();
    const row: PersistentViewerSession = {
      id,
      postId: postId as PersistentViewerSession["postId"],
      status: "active",
      payload: clone(payload),
      createdAt: t,
      updatedAt: t,
    };
    this.viewerSessions.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async updateViewerSession(sessionId: string, patch: Record<string, unknown>): Promise<ApiResponse<PersistentViewerSession>> {
    const s = this.viewerSessions.get(sessionId);
    if (!s) return this.delay(Promise.resolve(apiError("NOT_FOUND", "Session not found")));
    const next = { ...s, ...patch, updatedAt: nowIso() } as PersistentViewerSession;
    this.viewerSessions.set(sessionId, next);
    return this.delay(Promise.resolve(apiSuccess(clone(next))));
  }

  async recordRuntimeEvent(postId: string, payload: Record<string, unknown>): Promise<ApiResponse<PersistentRuntimeEvent>> {
    const id = genId("rt");
    const row: PersistentRuntimeEvent = {
      id: id as PersistentRuntimeEvent["id"],
      postId: postId as PersistentRuntimeEvent["postId"],
      type: String(payload.type ?? "unknown"),
      payload: clone(payload),
      createdAt: nowIso(),
    };
    this.runtimeEvents.set(id, row);
    return this.delay(Promise.resolve(apiSuccess(clone(row))));
  }

  async listRuntimeEvents(postId: string): Promise<ApiResponse<PersistentRuntimeEvent[]>> {
    const list = [...this.runtimeEvents.values()].filter((e) => (e.postId as unknown as string) === postId).map(clone);
    return this.delay(Promise.resolve(apiSuccess(list)));
  }

  async getCreatorPostAnalytics(postId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.delay(Promise.resolve(apiSuccess({ postId, views: 0, mock: true })));
  }

  async getCampaignAnalytics(campaignId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.delay(Promise.resolve(apiSuccess({ campaignId, spendMinor: 0, mock: true })));
  }

  async getMagicRevealAnalytics(revealId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.delay(Promise.resolve(apiSuccess({ revealId, unlocks: 0, mock: true })));
  }
}

export function createDefaultMockPersistenceAdapter(seedData?: Partial<MockSnapshot>, opts?: MockPersistenceOptions): StudioMockPersistenceAdapter {
  const a = new StudioMockPersistenceAdapter(opts);
  if (seedData) a.importSnapshot(seedData as MockSnapshot);
  return a;
}
