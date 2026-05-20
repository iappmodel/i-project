import type { Json } from "./database.types";

export type AlphabetEventType =
  | "safe_action_created"
  | "safe_action_policy_allowed"
  | "safe_action_policy_blocked"
  | "safe_action_approval_required"
  | "safe_action_approved"
  | "safe_action_started"
  | "safe_action_completed"
  | "safe_action_failed"
  | "safe_action_cancelled"
  | "safe_action_manual_required"
  | string;

export type AlphabetVerificationStatus = "verified" | "rejected" | "pending" | string;

export interface AlphabetEvent {
  eventId: string;
  userId?: string | null;
  coinCode: string;
  eventType: AlphabetEventType;
  objectType: string;
  objectId: string;
  sourceContext: string;
  rawScore: number | null;
  qualityScore: number | null;
  trustScoreAtEvent: number | null;
  riskScore: number | null;
  ageBand: string;
  verificationStatus: AlphabetVerificationStatus;
  metadata: Json;
  createdAt: string;
}
