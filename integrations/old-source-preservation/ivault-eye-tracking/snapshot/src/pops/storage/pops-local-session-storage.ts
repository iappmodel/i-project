import type { PopsStoredLocalSession } from "./pops-local-storage.types";
import { POPS_LOCAL_ACTIVE_SESSION_KEY } from "./pops-local-storage.types";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function getStorage(): Storage | null {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) return null;
  try {
    return globalThis.localStorage as Storage;
  } catch {
    return null;
  }
}

export function savePopsLocalSession(input: PopsStoredLocalSession): void {
  const s = getStorage();
  if (!s) return;
  s.setItem(POPS_LOCAL_ACTIVE_SESSION_KEY, JSON.stringify(input));
}

export function loadPopsLocalSession(): PopsStoredLocalSession | null {
  const s = getStorage();
  if (!s) return null;
  const raw = s.getItem(POPS_LOCAL_ACTIVE_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PopsStoredLocalSession;
  } catch {
    return null;
  }
}

export function clearPopsLocalSession(): void {
  const s = getStorage();
  if (!s) return;
  s.removeItem(POPS_LOCAL_ACTIVE_SESSION_KEY);
}

export function isPopsStoredSessionExpired(stored: PopsStoredLocalSession, nowMs: number = Date.now()): boolean {
  const t = Date.parse(stored.savedAt);
  if (!Number.isFinite(t)) return true;
  return nowMs - t > TWO_HOURS_MS;
}
