/**
 * Stage 10 — global studio store (useSyncExternalStore) + media pipeline actions.
 * Rules enforced in UI/store comments align with Stage 10 hard rules.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { StudioState, StudioTool, StudioProject, TimelineClip } from './studioTypes';
import { StudioMockMediaAdapter } from './media/studioMockMediaAdapter';
import { StudioSupabaseStorageAdapter } from './media/studioSupabaseStorageAdapter';
import type { StudioMediaAdapter } from './media/studioMediaAdapter';
import type { MediaAssetRecord, UploadProgress } from './media/studioMediaTypes';
import type { RenderJob } from './media/studioRenderTypes';
import { validateMediaFile } from './media/studioMediaValidation';
import {
  createRenderJobFromProject,
  enqueueRenderJob,
  updateRenderJobProgress,
  completeRenderJob,
  failRenderJob,
  cancelRenderJobLocal,
  simulateRenderProgress,
} from './media/studioRenderQueue';
import { buildRenderManifest } from './media/studioRenderManifest';
import { buildExportManifestFromRenderManifest } from './media/studioRenderManifest';
import { createCaptionArtifactFromStudioSubtitles } from './media/studioCaptionArtifacts';
import { createMaskArtifactFromMagicReveals } from './media/studioMagicMaskArtifacts';
import { createThumbnailPlaceholder } from './media/studioThumbnailEngine';
import { emitStudioEvent, STUDIO_MEDIA_EVENTS } from './studioEvents';
import type { CreateRenderJobRequest } from './media/studioMediaContracts';

const defaultProject: StudioProject = {
  id: 'proj_default',
  ownerUserId: 'mock_user',
  name: 'Untitled',
  playheadMs: 0,
  timeline: [],
  captionsEnabled: false,
  subtitleTracks: [],
  magicReveals: [],
  safetyScan: 'pending',
  rightsScan: 'pending',
};

const mockAdapter = new StudioMockMediaAdapter();
mockAdapter.setOwnerUserId(defaultProject.ownerUserId);

const supabaseAdapter = new StudioSupabaseStorageAdapter(null, {});

function initialState(): StudioState {
  return {
    mockMode: true,
    activeTool: 'trim',
    project: { ...defaultProject },
    mediaAdapterKind: 'mock',
    mediaAssets: [],
    uploadIntents: [],
    uploadProgress: {},
    renderJobs: [],
    renderManifests: [],
    captionArtifacts: [],
    magicMaskArtifacts: [],
    selectedMediaAssetId: null,
    selectedRenderJobId: null,
    mediaPipelineOpen: false,
    latestExportManifest: null,
    legacyExportManifest: null,
    exportSimulationCancel: null,
  };
}

let state: StudioState = initialState();
const storeListeners = new Set<() => void>();

function setState(partial: Partial<StudioState> | ((s: StudioState) => StudioState)) {
  state = typeof partial === 'function' ? partial(state) : { ...state, ...partial };
  storeListeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  storeListeners.add(cb);
  return () => storeListeners.delete(cb);
}

function getSnapshot() {
  return state;
}

function getMediaAdapter(): StudioMediaAdapter {
  return state.mediaAdapterKind === 'mock' ? mockAdapter : supabaseAdapter;
}

export type StudioAction =
  | { type: 'OPEN_MEDIA_PIPELINE' }
  | { type: 'CLOSE_MEDIA_PIPELINE' }
  | { type: 'SET_ACTIVE_TOOL'; tool: StudioTool }
  | { type: 'SET_MOCK_MODE'; mock: boolean }
  | { type: 'SET_MEDIA_ADAPTER'; kind: 'mock' | 'supabase' }
  | { type: 'CREATE_UPLOAD_INTENT'; fileName: string; mimeType: string; fileSizeBytes: number }
  | { type: 'START_MOCK_UPLOAD'; intentId: string; assetId: string }
  | { type: 'UPDATE_UPLOAD_PROGRESS'; progress: UploadProgress }
  | { type: 'CONFIRM_UPLOAD'; intentId: string; assetId: string }
  | { type: 'SELECT_MEDIA_ASSET'; id: string | null }
  | { type: 'CREATE_RENDER_JOB'; req: CreateRenderJobRequest }
  | { type: 'ENQUEUE_RENDER_JOB'; jobId: string }
  | { type: 'UPDATE_RENDER_PROGRESS'; jobId: string; progress: number }
  | { type: 'COMPLETE_RENDER_JOB'; jobId: string; outputAssetId: string }
  | { type: 'FAIL_RENDER_JOB'; jobId: string; error: string }
  | { type: 'CANCEL_RENDER_JOB'; jobId: string }
  | { type: 'CREATE_THUMBNAIL'; assetId: string; timeMs: number }
  | { type: 'CREATE_CAPTION_ARTIFACT' }
  | { type: 'CREATE_MAGIC_MASK_ARTIFACT' }
  | { type: 'BUILD_RENDER_MANIFEST'; jobId: string }
  | { type: 'SELECT_RENDER_JOB'; id: string | null }
  | { type: 'ADD_ASSET_FROM_DROP'; asset: MediaAssetRecord; clip?: TimelineClip }
  | { type: 'SET_EXPORT_CANCEL'; cancel: (() => void) | null }
  | { type: 'SET_LATEST_EXPORT_MANIFEST'; m: StudioState['latestExportManifest'] }
  | { type: 'SET_LEGACY_EXPORT'; m: StudioState['legacyExportManifest'] }
  | { type: 'SET_SAFETY_SCAN'; status: StudioState['project']['safetyScan'] }
  | { type: 'SET_RIGHTS_SCAN'; status: StudioState['project']['rightsScan'] }
  | { type: 'SET_CAPTIONS_ENABLED'; on: boolean };

export function dispatchStudio(action: StudioAction) {
  switch (action.type) {
    case 'OPEN_MEDIA_PIPELINE':
      setState({ mediaPipelineOpen: true, activeTool: 'media' });
      break;
    case 'CLOSE_MEDIA_PIPELINE':
      setState({ mediaPipelineOpen: false });
      break;
    case 'SET_ACTIVE_TOOL':
      setState((s) => ({
        ...s,
        activeTool: action.tool,
        mediaPipelineOpen: action.tool === 'media' ? true : s.mediaPipelineOpen && action.tool === 'media',
      }));
      if (action.tool === 'media') setState((s) => ({ ...s, mediaPipelineOpen: true }));
      emitStudioEvent('studio.tool_changed', { tool: action.tool });
      break;
    case 'SET_MOCK_MODE':
      setState({ mockMode: action.mock });
      break;
    case 'SET_MEDIA_ADAPTER':
      setState({ mediaAdapterKind: action.kind });
      break;
    case 'CREATE_UPLOAD_INTENT': {
      void (async () => {
        const adapter = getMediaAdapter();
        const res = await adapter.createUploadIntent({
          projectId: state.project.id,
          fileName: action.fileName,
          mimeType: action.mimeType,
          fileSizeBytes: action.fileSizeBytes,
          mutationMeta: { mockMode: state.mockMode },
        });
        if (!res.ok || !res.data) {
          emitStudioEvent(STUDIO_MEDIA_EVENTS.upload_failed, { message: res.message });
          return;
        }
        emitStudioEvent(STUDIO_MEDIA_EVENTS.upload_intent_created, { intentId: res.data.uploadIntent.id });
        setState((s) => ({
          ...s,
          uploadIntents: [...s.uploadIntents, res.data!.uploadIntent],
          mediaAssets: [...s.mediaAssets.filter((a) => a.id !== res.data!.assetDraft.id), res.data!.assetDraft],
        }));
      })();
      break;
    }
    case 'START_MOCK_UPLOAD': {
      const prog: UploadProgress = {
        assetId: action.assetId,
        bytesUploaded: 0,
        totalBytes: state.mediaAssets.find((a) => a.id === action.assetId)?.fileSizeBytes ?? 0,
        percent: 0,
        status: 'uploading',
      };
      setState((s) => ({ ...s, uploadProgress: { ...s.uploadProgress, [action.assetId]: prog } }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.upload_started, { assetId: action.assetId });
      let p = 0;
      const t = setInterval(() => {
        p += 20;
        const next: UploadProgress = {
          ...prog,
          bytesUploaded: Math.round((prog.totalBytes * p) / 100),
          percent: Math.min(100, p),
          status: p >= 100 ? 'completed' : 'uploading',
        };
        setState((s) => ({
          ...s,
          uploadProgress: { ...s.uploadProgress, [action.assetId]: next },
        }));
        emitStudioEvent(STUDIO_MEDIA_EVENTS.upload_progress, { assetId: action.assetId, percent: next.percent });
        if (p >= 100) {
          clearInterval(t);
          emitStudioEvent(STUDIO_MEDIA_EVENTS.upload_completed, { assetId: action.assetId });
        }
      }, 200);
      break;
    }
    case 'UPDATE_UPLOAD_PROGRESS':
      setState((s) => ({
        ...s,
        uploadProgress: { ...s.uploadProgress, [action.progress.assetId]: action.progress },
      }));
      break;
    case 'CONFIRM_UPLOAD': {
      void (async () => {
        const res = await getMediaAdapter().confirmUpload({
          uploadIntentId: action.intentId,
          assetId: action.assetId,
          uploadedBytes:
            state.uploadProgress[action.assetId]?.totalBytes ??
            state.mediaAssets.find((a) => a.id === action.assetId)?.fileSizeBytes ??
            0,
          mutationMeta: { mockMode: state.mockMode },
        });
        if (res.ok && res.data) {
          emitStudioEvent(STUDIO_MEDIA_EVENTS.upload_confirmed, { assetId: res.data.asset.id });
          setState((s) => ({
            ...s,
            mediaAssets: s.mediaAssets.map((a) => (a.id === res.data!.asset.id ? res.data!.asset : a)),
          }));
        }
      })();
      break;
    }
    case 'SELECT_MEDIA_ASSET':
      setState({ selectedMediaAssetId: action.id });
      break;
    case 'CREATE_RENDER_JOB': {
      const job = createRenderJobFromProject(state.project, {
        type: action.req.type,
        target: action.req.target,
        quality: action.req.quality,
        aspectRatio: action.req.aspectRatio,
        renderSettings: action.req.renderSettings,
        inputAssetIds: [],
        timelineSnapshot: { clips: state.project.timeline },
        magicRevealSnapshot: { reveals: state.project.magicReveals },
        captionSnapshot: { tracks: state.project.subtitleTracks },
      });
      setState((s) => ({ ...s, renderJobs: [...s.renderJobs, job], selectedRenderJobId: job.id }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.render_job_created, { jobId: job.id });
      break;
    }
    case 'ENQUEUE_RENDER_JOB':
      setState((s) => ({
        ...s,
        renderJobs: s.renderJobs.map((j) => (j.id === action.jobId ? enqueueRenderJob(j) : j)),
      }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.render_job_queued, { jobId: action.jobId });
      break;
    case 'UPDATE_RENDER_PROGRESS':
      setState((s) => ({
        ...s,
        renderJobs: s.renderJobs.map((j) =>
          j.id === action.jobId ? updateRenderJobProgress(j, action.progress) : j,
        ),
      }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.render_job_progress, { jobId: action.jobId, progress: action.progress });
      break;
    case 'COMPLETE_RENDER_JOB':
      setState((s) => ({
        ...s,
        renderJobs: s.renderJobs.map((j) =>
          j.id === action.jobId ? completeRenderJob(j, action.outputAssetId) : j,
        ),
      }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.render_job_completed, { jobId: action.jobId });
      break;
    case 'FAIL_RENDER_JOB':
      setState((s) => ({
        ...s,
        renderJobs: s.renderJobs.map((j) => (j.id === action.jobId ? failRenderJob(j, action.error) : j)),
      }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.render_job_failed, { jobId: action.jobId });
      break;
    case 'CANCEL_RENDER_JOB':
      setState((s) => ({
        ...s,
        renderJobs: s.renderJobs.map((j) => (j.id === action.jobId ? cancelRenderJobLocal(j) : j)),
      }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.render_job_cancelled, { jobId: action.jobId });
      break;
    case 'CREATE_THUMBNAIL': {
      const asset = state.mediaAssets.find((a) => a.id === action.assetId);
      if (!asset) break;
      const der = createThumbnailPlaceholder(asset, action.timeMs, `thumb_${Date.now()}`);
      setState((s) => ({
        ...s,
        mediaAssets: s.mediaAssets.map((a) =>
          a.id === asset.id ? { ...a, derivatives: [...a.derivatives, der.id] } : a,
      }));
      break;
    }
    case 'CREATE_CAPTION_ARTIFACT': {
      const art = createCaptionArtifactFromStudioSubtitles(state.project.id, {
        tracks: state.project.subtitleTracks,
      });
      if (art) {
        setState((s) => ({ ...s, captionArtifacts: [...s.captionArtifacts, art] }));
        emitStudioEvent(STUDIO_MEDIA_EVENTS.caption_artifact_created, { id: art.id });
      }
      break;
    }
    case 'CREATE_MAGIC_MASK_ARTIFACT': {
      const mm = createMaskArtifactFromMagicReveals(state.project.id, {
        magicReveals: state.project.magicReveals,
      });
      setState((s) => ({ ...s, magicMaskArtifacts: [...s.magicMaskArtifacts, mm] }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.magic_mask_artifact_created, { id: mm.id });
      break;
    }
    case 'BUILD_RENDER_MANIFEST': {
      const job = state.renderJobs.find((j) => j.id === action.jobId);
      if (!job || job.status !== 'completed' || !job.outputAssetId) break;
      const output = state.mediaAssets.find((a) => a.id === job.outputAssetId);
      if (!output) break;
      const manifest = buildRenderManifest({ renderJob: job, outputAsset: output });
      setState((s) => ({
        ...s,
        renderManifests: [...s.renderManifests, manifest],
        latestExportManifest: buildExportManifestFromRenderManifest(manifest),
      }));
      emitStudioEvent(STUDIO_MEDIA_EVENTS.render_manifest_created, { manifestId: manifest.id });
      break;
    }
    case 'SELECT_RENDER_JOB':
      setState({ selectedRenderJobId: action.id });
      break;
    case 'ADD_ASSET_FROM_DROP':
      setState((s) => ({
        ...s,
        mediaAssets: [...s.mediaAssets.filter((a) => a.id !== action.asset.id), action.asset],
        project: action.clip
          ? { ...s.project, timeline: [...s.project.timeline, action.clip] }
          : s.project,
        selectedMediaAssetId: action.asset.id,
      }));
      break;
    case 'SET_EXPORT_CANCEL':
      setState({ exportSimulationCancel: action.cancel });
      break;
    case 'SET_LATEST_EXPORT_MANIFEST':
      setState({ latestExportManifest: action.m });
      break;
    case 'SET_LEGACY_EXPORT':
      setState({ legacyExportManifest: action.m });
      break;
    case 'SET_SAFETY_SCAN':
      setState((s) => ({ ...s, project: { ...s.project, safetyScan: action.status } }));
      break;
    case 'SET_RIGHTS_SCAN':
      setState((s) => ({ ...s, project: { ...s.project, rightsScan: action.status } }));
      break;
    case 'SET_CAPTIONS_ENABLED':
      setState((s) => ({ ...s, project: { ...s.project, captionsEnabled: action.on } }));
      break;
    default:
      break;
  }
}

export function useStudioStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useStudioDispatch() {
  return useCallback((a: StudioAction) => dispatchStudio(a), []);
}

export function runExportPipelineMock(
  onUpdate: (msg: string) => void,
): Promise<{ manifestId: string | null }> {
  return new Promise((resolve) => {
    const s = getSnapshot();
    const v = s.mediaAssets.map((a) =>
      validateMediaFile({
        fileName: a.originalFileName,
        mimeType: a.mimeType,
        fileSizeBytes: a.fileSizeBytes,
      }),
    );
    if (v.some((x) => !x.valid)) {
      onUpdate('Media validation failed for one or more assets.');
      resolve({ manifestId: null });
      return;
    }
    const req: CreateRenderJobRequest = {
      projectId: s.project.id,
      type: 'final_export',
      target: 'i_feed',
      quality: 'standard',
      aspectRatio: '9:16',
      renderSettings: {
        width: 1080,
        height: 1920,
        fps: 30,
        bitrate: 8_000_000,
        includeWatermark: true,
        includeBurnedCaptions: s.project.captionsEnabled,
        includeMagicMasks: s.project.magicReveals.length > 0,
        includeAudio: true,
        normalizeAudio: true,
        outputMimeType: 'video/mp4',
        outputExtension: 'mp4',
      },
      mutationMeta: { mockMode: true },
    };
    dispatchStudio({ type: 'CREATE_RENDER_JOB', req });
    const jobId = getSnapshot().renderJobs[getSnapshot().renderJobs.length - 1]?.id;
    if (!jobId) {
      resolve({ manifestId: null });
      return;
    }
    dispatchStudio({ type: 'ENQUEUE_RENDER_JOB', jobId });
    const job = getSnapshot().renderJobs.find((j) => j.id === jobId)!;
    onUpdate('Render job queued…');
    const cancel = simulateRenderProgress(
      { ...job, status: 'rendering' },
      (j) => {
        dispatchStudio({ type: 'UPDATE_RENDER_PROGRESS', jobId, progress: j.progress });
        onUpdate(`Rendering… ${j.progress}%`);
      },
      (j) => {
        const outId = j.outputAssetId ?? `out_${jobId}`;
        const outAsset: MediaAssetRecord = {
          id: outId,
          projectId: s.project.id,
          ownerUserId: s.project.ownerUserId,
          source: 'generated_render',
          type: 'video',
          lifecycleStatus: 'ready',
          visibility: 'project_only',
          name: 'export.mp4',
          originalFileName: 'export.mp4',
          mimeType: 'video/mp4',
          mimeCategory: 'video',
          fileSizeBytes: 2 * 1024 * 1024,
          width: 1080,
          height: 1920,
          durationMs: 60_000,
          storageBucket: 'studio-renders',
          storagePath: `renders/${jobId}/output.mp4`,
          metadata: { mockExport: true },
          processingStatus: 'completed',
          derivatives: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setState((st) => ({
          ...st,
          renderJobs: st.renderJobs.map((x) => (x.id === jobId ? { ...j, outputAssetId: outId } : x)),
          mediaAssets: [...st.mediaAssets, outAsset],
        }));
        dispatchStudio({ type: 'COMPLETE_RENDER_JOB', jobId, outputAssetId: outId });
        dispatchStudio({ type: 'BUILD_RENDER_MANIFEST', jobId });
        onUpdate('Export manifest sealed.');
        resolve({ manifestId: getSnapshot().renderManifests.at(-1)?.id ?? null });
      },
      { outputAssetId: `out_${jobId}` },
    );
    dispatchStudio({ type: 'SET_EXPORT_CANCEL', cancel });
  });
}

export { validateMediaFile, getMediaAdapter, mockAdapter };
