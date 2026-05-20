/**
 * Studio event bus (Stages 4–10).
 * Bridge key media events from studioMediaEvents for analytics / plugins.
 */

import { STUDIO_MEDIA_EVENTS, type StudioMediaEventName } from './media/studioMediaEvents';

export type StudioEventDetail = Record<string, unknown>;

export type StudioEventName =
  | StudioMediaEventName
  | 'studio.tool_changed'
  | 'studio.project_updated'
  | 'studio.export_started'
  | 'studio.export_completed';

const listeners = new Map<StudioEventName, Set<(d: StudioEventDetail) => void>>();

export function emitStudioEvent(name: StudioEventName, detail: StudioEventDetail = {}) {
  listeners.get(name)?.forEach((cb) => cb(detail));
}

export function subscribeStudioEvent(
  name: StudioEventName,
  cb: (d: StudioEventDetail) => void,
): () => void {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name)!.add(cb);
  return () => listeners.get(name)?.delete(cb);
}

export { STUDIO_MEDIA_EVENTS };
