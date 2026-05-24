import type { PendingHoldReleaseStatus } from "./pending-hold.js";

export const PENDING_HOLD_RELEASE_LIFECYCLE_EVENT = {
  HOLD_CREATED: "HOLD_CREATED",
  RELEASE_APPROVED: "RELEASE_APPROVED",
  RELEASE_COMPLETED: "RELEASE_COMPLETED",
  RELEASE_CANCELLED: "RELEASE_CANCELLED",
  RELEASE_BLOCKED: "RELEASE_BLOCKED"
} as const;

export type PendingHoldReleaseLifecycleEventType =
  (typeof PENDING_HOLD_RELEASE_LIFECYCLE_EVENT)[keyof typeof PENDING_HOLD_RELEASE_LIFECYCLE_EVENT];

export interface PendingHoldReleaseLifecycleEventBase {
  type: PendingHoldReleaseLifecycleEventType;
  sessionId: string;
  occurredAt: string;
  reasonCodes: string[];
}

export interface HoldCreatedEvent extends PendingHoldReleaseLifecycleEventBase {
  type: typeof PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.HOLD_CREATED;
}

export interface ReleaseApprovedEvent extends PendingHoldReleaseLifecycleEventBase {
  type: typeof PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_APPROVED;
  approverRef?: string;
}

export interface ReleaseCompletedEvent extends PendingHoldReleaseLifecycleEventBase {
  type: typeof PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_COMPLETED;
  executionRef: string;
}

export interface ReleaseCancelledEvent extends PendingHoldReleaseLifecycleEventBase {
  type: typeof PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_CANCELLED;
  cancelReason: string;
}

export interface ReleaseBlockedEvent extends PendingHoldReleaseLifecycleEventBase {
  type: typeof PENDING_HOLD_RELEASE_LIFECYCLE_EVENT.RELEASE_BLOCKED;
  blockReason: string;
}

export type PendingHoldReleaseLifecycleEvent =
  | HoldCreatedEvent
  | ReleaseApprovedEvent
  | ReleaseCompletedEvent
  | ReleaseCancelledEvent
  | ReleaseBlockedEvent;

export interface PendingHoldReleaseState {
  releaseStatus: PendingHoldReleaseStatus;
  releaseLifecycleEvents: PendingHoldReleaseLifecycleEvent[];
}
