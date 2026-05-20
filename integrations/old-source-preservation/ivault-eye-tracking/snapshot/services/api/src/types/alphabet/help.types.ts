import type { AlphabetEvent } from "./event.types";

export type HelpContext =
  | "learning_help"
  | "emotional_support"
  | "technical_help"
  | "accessibility_help"
  | "community_help"
  | "emergency_help"
  | "mentorship_help"
  | "creator_help"
  | "marketplace_help"
  | "general_help";

export type HelpVerificationStatus =
  | "help_verified"
  | "noble_action_verified"
  | "useful_but_unverified"
  | "needs_review"
  | "rejected"
  | "suspicious";

export type HelpSessionStatus =
  | "started"
  | "completed"
  | "verified"
  | "noble"
  | "useful_but_unverified"
  | "needs_review"
  | "rejected"
  | "suspicious"
  | "expired";

export interface HelpSession {
  helpSessionId: string;
  helperUserId: string;
  recipientUserId: string;
  context: HelpContext;
  objectType?: string | null;
  objectId?: string | null;
  durationMs: number;
  status: HelpSessionStatus;
  helperAgeBand: string;
  recipientAgeBand: string;
  startedAt: string;
  completedAt?: string | null;
  updatedAt: string;
}

export interface HelpSignalInput {
  helpSessionId: string;
  helperUserId: string;
  recipientUserId: string;
  context: HelpContext;
  durationMs: number;
  recipientConfirmed: boolean;
  recipientUsefulnessScore: number;
  recipientOutcomeScore: number;
  helperEffortScore: number;
  kindnessScore: number;
  clarityScore: number;
  followThroughScore: number;
  repeatHelpScore: number;
  impactScore: number;
  vulnerabilityLevel: number;
  sensitivityLevel: number;
  independentOutcomeEvidenceScore: number;
  communityValidationScore: number;
  systemValidationScore: number;
  collusionRisk: number;
  manipulationRisk: number;
  harassmentRisk: number;
  fakeRecipientRisk: number;
  paymentCoercionRisk: number;
  deviceIntegrityScore: number;
  helperAgeBand: string;
  recipientAgeBand: string;
  metadata?: Record<string, unknown>;
}

export interface HelpRuleSet {
  context: HelpContext;
  minDurationMs: number;
  minRecipientUsefulnessScore: number;
  minRecipientOutcomeScore: number;
  minHelperEffortScore: number;
  minHelpScore: number;
  minOutcomeScore: number;
  minNobilityScore: number;
  minIndependentEvidenceForNobility: number;
  maxRiskScore: number;
  maxCollusionRisk: number;
  maxFakeRecipientRisk: number;
  maxHarassmentRisk: number;
  allowsUnder13Helper: boolean;
  allowsUnder13Recipient: boolean;
  allowsTeenHelper: boolean;
  allowsTeenRecipient: boolean;
  requiresReviewIfSensitive: boolean;
  requiresRecipientConfirmation: boolean;
  active: boolean;
}

export interface HelpVerificationResult {
  helpSessionId: string;
  helperUserId: string;
  recipientUserId: string;
  status: HelpVerificationStatus;
  helpScore: number;
  outcomeScore: number;
  nobilityScore: number;
  riskScore: number;
  reasons: string[];
  helpCompletedEvent: AlphabetEvent;
  hCoinEvent?: AlphabetEvent | null;
  nCoinEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
