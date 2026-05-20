/** Stage 10 — media + render + storage event constants (bridge into studioEvents). */

export const STUDIO_MEDIA_EVENTS = {
  upload_intent_requested: 'media.upload_intent_requested',
  upload_intent_created: 'media.upload_intent_created',
  upload_started: 'media.upload_started',
  upload_progress: 'media.upload_progress',
  upload_completed: 'media.upload_completed',
  upload_failed: 'media.upload_failed',
  upload_confirmed: 'media.upload_confirmed',

  processing_queued: 'media.processing_queued',
  processing_started: 'media.processing_started',
  processing_completed: 'media.processing_completed',
  processing_failed: 'media.processing_failed',

  thumbnail_requested: 'media.thumbnail_requested',
  thumbnail_created: 'media.thumbnail_created',
  caption_artifact_created: 'media.caption_artifact_created',
  magic_mask_artifact_created: 'media.magic_mask_artifact_created',

  render_job_created: 'render.job_created',
  render_job_queued: 'render.job_queued',
  render_job_started: 'render.job_started',
  render_job_progress: 'render.job_progress',
  render_job_completed: 'render.job_completed',
  render_job_failed: 'render.job_failed',
  render_job_cancelled: 'render.job_cancelled',
  render_manifest_created: 'render.manifest_created',

  storage_path_generated: 'storage.path_generated',
  storage_signed_url_requested: 'storage.signed_url_requested',
  storage_public_url_created: 'storage.public_url_created',
} as const;

export type StudioMediaEventName =
  (typeof STUDIO_MEDIA_EVENTS)[keyof typeof STUDIO_MEDIA_EVENTS];
