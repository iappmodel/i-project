/**
 * Stage 11 — local mock presence (no websockets).
 */

import type { StudioPresence } from './studioCollabTypes';

const colorPalette = ['#5B8DEF', '#E07C3E', '#3EB489', '#C45BAA', '#D4A024', '#6B7280'];

export function getPresenceColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h + userId.charCodeAt(i) * (i + 1)) % colorPalette.length;
  return colorPalette[h] ?? colorPalette[0];
}

export function updatePresence(
  presence: Record<string, StudioPresence>,
  collaboratorId: string,
  patch: Partial<StudioPresence>,
): Record<string, StudioPresence> {
  const cur = presence[collaboratorId];
  if (!cur) return presence;
  return { ...presence, [collaboratorId]: { ...cur, ...patch, lastSeenAt: new Date().toISOString() } };
}

export function setPresenceOnline(presence: Record<string, StudioPresence>, collaboratorId: string) {
  return updatePresence(presence, collaboratorId, { status: 'online' });
}

export function setPresenceIdle(presence: Record<string, StudioPresence>, collaboratorId: string) {
  return updatePresence(presence, collaboratorId, { status: 'idle' });
}

export function setPresenceOffline(presence: Record<string, StudioPresence>, collaboratorId: string) {
  return updatePresence(presence, collaboratorId, { status: 'offline' });
}

export function getActiveCollaborators(projectId: string, presence: Record<string, StudioPresence>): StudioPresence[] {
  return Object.values(presence).filter((p) => p.projectId === projectId && p.status !== 'offline');
}

export function getPresenceByTool(
  projectId: string,
  presence: Record<string, StudioPresence>,
  tool: string,
): StudioPresence[] {
  return getActiveCollaborators(projectId, presence).filter((p) => p.activeTool === tool);
}
