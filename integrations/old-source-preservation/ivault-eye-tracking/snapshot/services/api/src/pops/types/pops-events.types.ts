import type { PopsSignalBatch, PopsSignalSource } from "./pops.types";

export const POPS_EVENT_TYPE = {
  SESSION_STARTED: "SESSION_STARTED",
  SESSION_ENDED: "SESSION_ENDED",
  SCREEN_ACTIVE: "SCREEN_ACTIVE",
  SCREEN_INACTIVE: "SCREEN_INACTIVE",
  APP_FOREGROUNDED: "APP_FOREGROUNDED",
  APP_BACKGROUNDED: "APP_BACKGROUNDED",
  CONTENT_STARTED: "CONTENT_STARTED",
  CONTENT_PROGRESS: "CONTENT_PROGRESS",
  CONTENT_PAUSED: "CONTENT_PAUSED",
  CONTENT_RESUMED: "CONTENT_RESUMED",
  CONTENT_COMPLETED: "CONTENT_COMPLETED",
  TOUCH_TAP: "TOUCH_TAP",
  TOUCH_SCROLL: "TOUCH_SCROLL",
  TOUCH_SWIPE: "TOUCH_SWIPE",
  TOUCH_HESITATION: "TOUCH_HESITATION",
  TOUCH_RAGE_TAP: "TOUCH_RAGE_TAP",
  MOTION_STABLE: "MOTION_STABLE",
  MOTION_UNSTABLE: "MOTION_UNSTABLE",
  DEVICE_PICKED_UP: "DEVICE_PICKED_UP",
  DEVICE_TABLE_STATE: "DEVICE_TABLE_STATE",
  FACE_PRESENT: "FACE_PRESENT",
  FACE_MISSING: "FACE_MISSING",
  VISUAL_DEGRADED: "VISUAL_DEGRADED",
  AUDIO_DISTRACTION_DETECTED: "AUDIO_DISTRACTION_DETECTED",
  NOTIFICATION_INTERRUPTION: "NOTIFICATION_INTERRUPTION",
  LOCATION_CLASS_CONFIRMED: "LOCATION_CLASS_CONFIRMED",
  DEVICE_INTEGRITY_WARNING: "DEVICE_INTEGRITY_WARNING",
  AUTOMATION_RISK_DETECTED: "AUTOMATION_RISK_DETECTED",
  REWARD_CHECKPOINT: "REWARD_CHECKPOINT",
  TRUST_CHECKPOINT: "TRUST_CHECKPOINT",
  PRIVACY_RECEIPT_CREATED: "PRIVACY_RECEIPT_CREATED"
} as const;

export type PopsEventType = (typeof POPS_EVENT_TYPE)[keyof typeof POPS_EVENT_TYPE];

export interface PopsEvent {
  id: string;
  sessionId: string;
  userId: string;
  type: PopsEventType;
  source: PopsSignalSource;
  timestampMs: number;
  payload: Record<string, unknown>;
}

export interface PopsEventServiceInput {
  sessionId: string;
  userId: string;
  eventType: PopsEventType;
  signalSource: PopsSignalSource;
  payload?: Record<string, unknown>;
  timestampMs?: number;
}

export interface PopsBatchDerivedEvents {
  events: PopsEvent[];
  derivedCheckpointTypes: PopsEventType[];
}

export interface PopsEventNormalizationResult {
  batch: PopsSignalBatch;
  events: PopsEvent[];
}
