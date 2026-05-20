import type { Json } from "./database.types";

export type CoinCode = "A" | "C" | "E" | "J" | "O" | "Q" | "U" | "V" | "X" | string;

export type AlphabetEventType =
  | "admin_command_item_created"
  | "admin_command_item_assigned"
  | "admin_command_priority_changed"
  | "admin_command_evidence_requested"
  | "admin_command_action_approved"
  | "admin_command_action_rejected"
  | "admin_command_item_resolved"
  | "admin_command_item_dismissed"
  | "admin_command_item_escalated"
  | "admin_command_followup_review_created"
  | "admin_command_note_added";

export interface AlphabetEvent {
  eventId: string;
  userId: string;
  coinCode?: CoinCode | null;
  eventType: AlphabetEventType;
  objectType?: string | null;
  objectId?: string | null;
  sourceContext: "admin_command_center";
  rawScore?: number | null;
  qualityScore?: number | null;
  trustScoreAtEvent?: number | null;
  riskScore?: number | null;
  ageBand?: string | null;
  verificationStatus: string;
  metadata?: Json;
  createdAt: string;
}
