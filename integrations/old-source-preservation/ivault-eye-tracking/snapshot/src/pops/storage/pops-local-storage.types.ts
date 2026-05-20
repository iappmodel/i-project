import type { PopsEvent } from "../types/pops-events.types";
import type { PopsSession } from "../types/pops.types";

export const POPS_LOCAL_ACTIVE_SESSION_KEY = "pops.mvp.activeSession";

export interface PopsStoredLocalSession {
  version: number;
  session: PopsSession;
  events: PopsEvent[];
  lastProgressPct: number;
  savedAt: string;
}
