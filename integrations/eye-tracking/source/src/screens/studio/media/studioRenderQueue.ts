/** Stage 10 — local render queue reducer-style helpers (simulation only). */

import type { RenderJob, RenderQuality, RenderSettings, RenderTarget, RenderJobType } from './studioRenderTypes';

export interface MinimalProjectForRender {
  id: string;
  ownerUserId: string;
  playheadMs?: number;
}

export interface CreateRenderJobFromProjectInput {
  projectId: string;
  ownerUserId: string;
  type: RenderJobType;
  target: RenderTarget;
  quality: RenderQuality;
  aspectRatio: string;
  renderSettings: RenderSettings;
  inputAssetIds: string[];
  timelineSnapshot: Record<string, unknown>;
  magicRevealSnapshot: Record<string, unknown>;
  captionSnapshot: Record<string, unknown>;
}

export function createRenderJobFromProject(
  project: MinimalProjectForRender,
  settings: Omit<CreateRenderJobFromProjectInput, 'projectId' | 'ownerUserId'> &
    Partial<Pick<CreateRenderJobFromProjectInput, 'projectId' | 'ownerUserId'>>,
): RenderJob {
  const now = new Date().toISOString();
  return {
    id: `rj_${Date.now()}`,
    projectId: settings.projectId ?? project.id,
    ownerUserId: settings.ownerUserId ?? project.ownerUserId,
    type: settings.type,
    status: 'draft',
    target: settings.target,
    quality: settings.quality,
    aspectRatio: settings.aspectRatio,
    inputAssetIds: settings.inputAssetIds,
    timelineSnapshot: settings.timelineSnapshot,
    magicRevealSnapshot: settings.magicRevealSnapshot,
    captionSnapshot: settings.captionSnapshot,
    renderSettings: settings.renderSettings,
    progress: 0,
    createdAt: now,
  };
}

export function enqueueRenderJob(job: RenderJob): RenderJob {
  return { ...job, status: 'queued', progress: 0 };
}

export function updateRenderJobProgress(job: RenderJob, progress: number): RenderJob {
  return { ...job, progress: Math.max(0, Math.min(100, progress)) };
}

export function completeRenderJob(
  job: RenderJob,
  outputAssetId: string,
): RenderJob {
  const now = new Date().toISOString();
  return {
    ...job,
    status: 'completed',
    progress: 100,
    outputAssetId,
    completedAt: now,
    startedAt: job.startedAt ?? now,
  };
}

export function failRenderJob(job: RenderJob, error: string): RenderJob {
  return { ...job, status: 'failed', error, progress: job.progress };
}

export function cancelRenderJobLocal(job: RenderJob): RenderJob {
  if (job.status === 'completed') return job;
  return { ...job, status: 'cancelled', progress: job.progress };
}

export function getActiveRenderJobs(jobs: RenderJob[], projectId: string): RenderJob[] {
  return jobs.filter(
    (j) =>
      j.projectId === projectId &&
      ['queued', 'preparing', 'rendering', 'postprocessing'].includes(j.status),
  );
}

export function getLatestCompletedRender(jobs: RenderJob[], projectId: string): RenderJob | null {
  const completed = jobs
    .filter((j) => j.projectId === projectId && j.status === 'completed' && j.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  return completed[0] ?? null;
}

export function simulateRenderProgress(
  job: RenderJob,
  onProgress: (j: RenderJob) => void,
  onComplete: (j: RenderJob) => void,
  opts?: { stepMs?: number; outputAssetId?: string },
): () => void {
  let cancelled = false;
  const steps = [10, 30, 55, 80, 100];
  let i = 0;
  const stepMs = opts?.stepMs ?? 400;
  let current: RenderJob = {
    ...job,
    status: 'queued',
    startedAt: new Date().toISOString(),
  };
  onProgress(current);

  const tick = () => {
    if (cancelled) return;
    if (i >= steps.length) {
      onComplete(
        completeRenderJob(
          { ...current, status: 'postprocessing' },
          opts?.outputAssetId ?? `out_${job.id}`,
        ),
      );
      return;
    }
    const p = steps[i++];
    let next: RenderJob = current;
    if (p <= 30) next = { ...current, status: 'preparing', progress: p };
    else if (p <= 80) next = { ...current, status: 'rendering', progress: p };
    else next = { ...current, status: 'postprocessing', progress: p };
    current = next;
    onProgress(current);
    setTimeout(tick, stepMs);
  };
  setTimeout(tick, stepMs);
  return () => {
    cancelled = true;
  };
}
