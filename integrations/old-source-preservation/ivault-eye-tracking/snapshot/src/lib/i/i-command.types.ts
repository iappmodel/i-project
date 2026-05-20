export type ICommandDomain =
  | "private_self"
  | "wallet_economy"
  | "feed_content"
  | "studio_creation"
  | "originality_protection"
  | "health"
  | "career"
  | "finance"
  | "relationships"
  | "navigation"
  | "emergency_safety"
  | "unknown";

export type ICommandVerb =
  | "want"
  | "need"
  | "feel"
  | "think"
  | "remember"
  | "forgot"
  | "pay"
  | "earn"
  | "post"
  | "make"
  | "protect"
  | "go"
  | "plan"
  | "confess"
  | "save"
  | "withdraw"
  | "convert"
  | "help"
  | "unknown";

export type IPrivacyLevel =
  | "public_safe"
  | "personal"
  | "private"
  | "deep_private"
  | "restricted";

export type IMemoryClass =
  | "none"
  | "temporary"
  | "preference"
  | "goal"
  | "pattern"
  | "sensitive"
  | "restricted";

export type ICommandUxState =
  | "idle"
  | "listening"
  | "understanding"
  | "needs_consent"
  | "doing"
  | "done"
  | "private_mode"
  | "blocked"
  | "error";

export type ICommandActionType =
  | "open_private_session"
  | "open_wallet"
  | "prepare_payment"
  | "open_earn"
  | "open_studio"
  | "prepare_post"
  | "protect_media"
  | "open_health_plan"
  | "open_career_plan"
  | "open_finance_plan"
  | "open_relationship_reflection"
  | "open_navigation"
  | "safety_escalation"
  | "ask_clarifying_question"
  | "none";

export interface ICommandInput {
  raw: string;
  userId: string;
  source: "text" | "voice" | "shortcut" | "system";
  timestamp: string;
}

export interface ICommandParseResult {
  isICommand: boolean;
  raw: string;
  normalized: string;
  body: string;
  verb: ICommandVerb;
  domain: ICommandDomain;
  privacyLevel: IPrivacyLevel;
  memoryClass: IMemoryClass;
  confidence: number;
  entities: ICommandEntities;
  safetyFlags: ISafetyFlag[];
}

export interface ICommandEntities {
  amount?: number;
  currency?: string;
  personName?: string;
  topic?: string;
  object?: string;
  platform?: string;
  timeframe?: string;
}

export type ISafetyFlag =
  | "self_harm"
  | "violence"
  | "medical_emergency"
  | "abuse"
  | "minor_safety"
  | "severe_distress"
  | "none";

export interface ICommandRouteResult {
  actionType: ICommandActionType;
  uxState: ICommandUxState;
  title: string;
  message: string;
  requiresConfirmation: boolean;
  requiresMemoryConsent: boolean;
  suggestedActionLabel?: string;
  nextRoute?: string;
  payload?: Record<string, unknown>;
}

export interface ICommandEngineResult {
  parse: ICommandParseResult;
  route: ICommandRouteResult;
  event: ICommandEvent;
}

export interface ICommandEvent {
  id: string;
  userId: string;
  raw: string;
  verb: ICommandVerb;
  domain: ICommandDomain;
  privacyLevel: IPrivacyLevel;
  memoryClass: IMemoryClass;
  actionType: ICommandActionType;
  safetyFlags: ISafetyFlag[];
  confidence: number;
  createdAt: string;
}
