/**
 * [ i ] Studio Stage 8 — maps UI/store models ↔ persistent rows. Components must not call the adapter directly.
 */

import type { PostPackage } from "../publish/studioPublishTypes";
import type { MagicReveal, StudioAsset, StudioClip, StudioProject, StudioTrack } from "../studioTypes";
import type { StudioLedgerEntry } from "../wallet/studioWalletTypes";
import { apiError, apiSuccess, type ApiResponse, type ProjectId, type TrackId, type ClipId, type LedgerEntryId, type PostId, type WalletAccountId } from "./studioApiTypes";
import type { StudioPersistenceAdapter } from "./studioPersistenceAdapter";
import type {
  PersistentCampaign,
  PersistentLedgerEntry,
  PersistentMagicReveal,
  PersistentPostPackage,
  PersistentStudioClip,
  PersistentStudioProject,
  PersistentStudioTrack,
} from "./studioPersistenceTypes";

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function nowIso() {
  return new Date().toISOString();
}

/** Full editor project JSON for opaque server `draft_payload`. */
export function studioProjectToDraftPayload(project: StudioProject): Record<string, unknown> {
  return deepClone(project) as unknown as Record<string, unknown>;
}

export function draftPayloadToStudioProject(draft: Record<string, unknown>, fallback: StudioProject): StudioProject {
  const base = deepClone(fallback);
  const merged = { ...base, ...draft } as StudioProject;
  merged.assets = Array.isArray(draft.assets) ? (draft.assets as StudioAsset[]) : merged.assets;
  merged.tracks = Array.isArray(draft.tracks) ? (draft.tracks as StudioTrack[]) : merged.tracks;
  merged.clips = Array.isArray(draft.clips) ? (draft.clips as StudioClip[]) : merged.clips;
  merged.magicReveals = Array.isArray(draft.magicReveals) ? (draft.magicReveals as MagicReveal[]) : merged.magicReveals;
  return merged;
}

function toPersistentTrack(track: StudioTrack, projectId: string): PersistentStudioTrack {
  const t = nowIso();
  return {
    id: track.id as TrackId,
    projectId: projectId as ProjectId,
    version: 1,
    payload: deepClone(track) as unknown as Record<string, unknown>,
    createdAt: t,
    updatedAt: t,
  };
}

function toPersistentClip(clip: StudioClip, projectId: string): PersistentStudioClip {
  const t = nowIso();
  return {
    id: clip.id as ClipId,
    projectId: projectId as ProjectId,
    trackId: clip.trackId as TrackId,
    version: 1,
    payload: deepClone(clip) as unknown as Record<string, unknown>,
    createdAt: t,
    updatedAt: t,
  };
}

function toPersistentMagicReveal(reveal: MagicReveal): PersistentMagicReveal {
  const t = nowIso();
  return {
    id: reveal.id as PersistentMagicReveal["id"],
    projectId: reveal.projectId as PersistentMagicReveal["projectId"],
    ownerUserId: reveal.ownerUserId as PersistentMagicReveal["ownerUserId"],
    status: "draft",
    payload: deepClone(reveal) as unknown as Record<string, unknown>,
    version: 1,
    createdAt: t,
    updatedAt: t,
  };
}

function ledgerEntryToPersistent(e: StudioLedgerEntry): PersistentLedgerEntry {
  return {
    id: e.id as LedgerEntryId,
    walletAccountId: (e.toAccountId ?? e.fromAccountId) as WalletAccountId | undefined,
    projectId: e.projectId as ProjectId | undefined,
    postId: e.postId as PostId | undefined,
    status: e.status === "reversed" ? "reversed" : e.status === "completed" ? "completed" : "pending",
    payload: deepClone({ ...e, unlockId: e.unlockId }),
    createdAt: e.createdAt || nowIso(),
  };
}

export class StudioRepository {
  constructor(private readonly adapter: StudioPersistenceAdapter) {}

  async createProjectFromLocalState(project: StudioProject): Promise<ApiResponse<PersistentStudioProject>> {
    return this.adapter.createProject({
      id: project.id,
      ownerUserId: project.ownerUserId,
      title: project.title,
      draftPayload: studioProjectToDraftPayload(project),
      status: "draft",
    });
  }

  async saveCurrentProject(project: StudioProject): Promise<ApiResponse<PersistentStudioProject>> {
    const existing = await this.adapter.getProject(project.id);
    if (existing.ok) {
      return this.adapter.updateProject(project.id, {
        title: project.title,
        draftPayload: studioProjectToDraftPayload(project),
      });
    }
    return this.createProjectFromLocalState(project);
  }

  async syncLocalStateToPersistence(project: StudioProject): Promise<{
    project: ApiResponse<PersistentStudioProject>;
    tracks: ApiResponse<PersistentStudioTrack[]>;
    clips: ApiResponse<PersistentStudioClip[]>;
  }> {
    const projectRes = await this.saveCurrentProject(project);
    const tracks = project.tracks.map((tr) => toPersistentTrack(tr, project.id));
    const clips = project.clips.map((c) => toPersistentClip(c, project.id));
    const [tracksRes, clipsRes] = await Promise.all([
      this.adapter.saveTracks(project.id, tracks),
      this.adapter.saveClips(project.id, clips),
    ]);
    return { project: projectRes, tracks: tracksRes, clips: clipsRes };
  }

  async persistMagicReveal(project: StudioProject, reveal: MagicReveal): Promise<ApiResponse<PersistentMagicReveal>> {
    const list = await this.adapter.listMagicReveals(project.id);
    if (list.ok && list.data.some((m) => (m.id as unknown as string) === reveal.id)) {
      return this.adapter.updateMagicReveal(reveal.id, deepClone(reveal) as unknown as Record<string, unknown>);
    }
    return this.adapter.createMagicReveal(project.id, {
      ownerUserId: reveal.ownerUserId,
      ...(deepClone(reveal) as unknown as Record<string, unknown>),
    });
  }

  async persistMagicReveals(project: StudioProject): Promise<ApiResponse<PersistentMagicReveal>[]> {
    const out: ApiResponse<PersistentMagicReveal>[] = [];
    for (const r of project.magicReveals) {
      out.push(await this.persistMagicReveal(project, r));
    }
    return out;
  }

  async persistPublishPackage(project: StudioProject, pkg: PostPackage): Promise<ApiResponse<PersistentPostPackage>> {
    const owner = project.ownerUserId;
    const job = await this.adapter.createExportJob(project.id, { ownerUserId: owner, label: "repo_build_package" });
    if (!job.ok) return job as ApiResponse<PersistentPostPackage>;
    return this.adapter.buildPostPackage(project.id, job.data.id, {
      ownerUserId: owner,
      postPackage: deepClone(pkg) as unknown as Record<string, unknown>,
    });
  }

  async persistCampaign(project: StudioProject): Promise<ApiResponse<PersistentCampaign>> {
    const campId = `campaign_${project.id}`;
    const existing = await this.adapter.listCampaigns(project.id);
    if (existing.ok) {
      const hit = existing.data.find((c) => (c.id as unknown as string) === campId);
      if (hit) {
        return this.adapter.updateCampaign(campId, { monetization: deepClone(project.monetization), monetizationMode: project.monetizationMode });
      }
    }
    return this.adapter.createCampaign(project.id, {
      id: campId,
      ownerUserId: project.ownerUserId,
      monetization: deepClone(project.monetization),
      monetizationMode: project.monetizationMode,
    });
  }

  async persistUnlockTransaction(entries: StudioLedgerEntry[]): Promise<ApiResponse<PersistentLedgerEntry[]>> {
    const rows = entries.map(ledgerEntryToPersistent);
    const res = await this.adapter.createLedgerEntries(rows);
    if (!res.ok && res.error.code === "SERVER_AUTHORITY_REQUIRED") {
      return apiError(
        res.error.code,
        `${res.error.message} Use Edge Function / service role for production ledger writes; mock adapter only for local demo.`,
        { ...res.error.details, repositorySurfaced: true },
        res.error.traceId
      );
    }
    return res;
  }

  async persistVerificationRecord(payload: Record<string, unknown>): Promise<ApiResponse<import("./studioPersistenceTypes").PersistentVerificationRecord>> {
    return this.adapter.createVerificationRecord(payload);
  }

  async persistDispute(payload: Record<string, unknown>): Promise<ApiResponse<import("./studioPersistenceTypes").PersistentDispute>> {
    return this.adapter.createDispute(payload);
  }

  async loadRuntimeFeed(postId: string): Promise<{
    events: ApiResponse<import("./studioPersistenceTypes").PersistentRuntimeEvent[]>;
  }> {
    const events = await this.adapter.listRuntimeEvents(postId);
    return { events };
  }

  async hydrateStudioStateFromPersistence(
    projectId: string,
    fallback: StudioProject
  ): Promise<ApiResponse<StudioProject>> {
    const res = await this.adapter.getProject(projectId);
    if (!res.ok) {
      return apiError(res.error.code, res.error.message, res.error.details, res.error.traceId);
    }
    const merged = draftPayloadToStudioProject(res.data.draftPayload, fallback);
    merged.id = res.data.id as unknown as string;
    merged.ownerUserId = res.data.ownerUserId as unknown as string;
    merged.title = res.data.title;
    merged.updatedAt = nowIso();
    return apiSuccess(merged);
  }
}
