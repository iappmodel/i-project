export type PopsEventType =
  | "SESSION_STARTED"
  | "SESSION_PAUSED"
  | "SESSION_RESUMED"
  | "SESSION_COMPLETED"
  | "APP_BACKGROUNDED"
  | "APP_FOREGROUNDED"
  | "SCREEN_ACTIVE"
  | "SCREEN_INACTIVE"
  | "CONTENT_STARTED"
  | "CONTENT_PROGRESS"
  | "CONTENT_PAUSED"
  | "CONTENT_RESUMED"
  | "CONTENT_COMPLETED"
  | "TOUCH_TAP"
  | "TOUCH_SCROLL"
  | "SIMULATED_BACKGROUND_FRAUD"
  | "SIMULATED_DEVICE_WARNING"
  | "SIMULATED_IMPOSSIBLE_SPEED";

export type PopsSignalSource =
  | "SESSION"
  | "APP_STATE"
  | "SCREEN"
  | "CONTENT"
  | "TOUCH"
  | "DEVICE"
  | "SIMULATION";

export interface PopsEvent {
  eventId: string;
  sessionId: string;
  userId: string;
  eventType: PopsEventType;
  source: PopsSignalSource;
  clientTimestampMs: number;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface PopsSignalPrivacy {
  rawCameraStored: false;
  rawAudioStored: false;
  rawLocationStored: false;
  localFeatureExtractionUsed: boolean;
}

export interface PopsSignalBatch {
  batchId: string;
  sessionId: string;
  userId: string;
  clientTimestampMs: number;
  windowStartMs: number;
  windowEndMs: number;
  screenActiveRatio: number;
  appForegroundRatio: number;
  contentProgressDeltaPct: number;
  touchEventCount: number;
  tapCount: number;
  scrollDistance: number;
  deviceIntegrityScore: number;
  accountContinuityScore: number;
  privacy: PopsSignalPrivacy;
}

/** Minimal wire events for local sponsored-watch MVP demo (`usePopsSession`). */
export interface PopsBackendEvent {
  type: string;
  sessionId: string;
  timestampMs: number;
  eventId?: string;
  payload?: Record<string, unknown>;
}

export const POPS_EVENT_TYPES: readonly PopsEventType[] = [
  "SESSION_STARTED",
  "SESSION_PAUSED",
  "SESSION_RESUMED",
  "SESSION_COMPLETED",
  "APP_BACKGROUNDED",
  "APP_FOREGROUNDED",
  "SCREEN_ACTIVE",
  "SCREEN_INACTIVE",
  "CONTENT_STARTED",
  "CONTENT_PROGRESS",
  "CONTENT_PAUSED",
  "CONTENT_RESUMED",
  "CONTENT_COMPLETED",
  "TOUCH_TAP",
  "TOUCH_SCROLL",
  "SIMULATED_BACKGROUND_FRAUD",
  "SIMULATED_DEVICE_WARNING",
  "SIMULATED_IMPOSSIBLE_SPEED",
] as const;

export const POPS_SIGNAL_SOURCES: readonly PopsSignalSource[] = [
  "SESSION",
  "APP_STATE",
  "SCREEN",
  "CONTENT",
  "TOUCH",
  "DEVICE",
  "SIMULATION",
] as const;
