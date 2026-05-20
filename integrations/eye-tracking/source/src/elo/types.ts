export type EloMemoryType =
  | 'declared_preference'
  | 'inferred_preference'
  | 'behavior_pattern'
  | 'earning_pattern'
  | 'wallet_pattern'
  | 'trust_pattern'
  | 'creator_pattern'
  | 'content_pattern'
  | 'risk_pattern'
  | 'goal'
  | 'boundary'
  | 'life_context';

export type EloPermissionKey =
  | 'memory'
  | 'proactive_suggestions'
  | 'wallet_advisory'
  | 'location_opportunities'
  | 'cross_platform_context'
  | 'automation_preparation';

export type EloOrbState =
  | 'idle'
  | 'thinking'
  | 'hasInsight'
  | 'warning'
  | 'celebrating'
  | 'blocked'
  | 'muted';

export interface EloPermission {
  key: EloPermissionKey;
  label: string;
  description: string;
  granted: boolean;
}

export interface EloProfile {
  id: string;
  userId: string;
  eloEnabled: boolean;
  memoryEnabled: boolean;
  proactiveEnabled: boolean;
  automationEnabled: boolean;
  tone: 'clear' | 'warm' | 'coach' | 'concise';
}

export interface EloMemory {
  id: string;
  userId: string;
  memoryType: EloMemoryType;
  source: 'declared' | 'inferred' | 'system';
  content: Record<string, unknown>;
  confidence: number;
  sensitivity: 'low' | 'normal' | 'sensitive';
  userVisible: boolean;
  userEditable: boolean;
  createdAt: string;
}

export interface EloContextSnapshot {
  id: string;
  userId: string;
  sessionId: string;
  screen: string;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface EloAction {
  id: string;
  actionType:
    | 'open_screen'
    | 'save_offer'
    | 'draft_content'
    | 'prepare_withdrawal'
    | 'prepare_conversion'
    | 'withdraw'
    | 'convert'
    | 'pay'
    | 'external_post'
    | 'external_message'
    | 'identity_verification'
    | 'bank_linking'
    | 'tax_forms';
  payload: Record<string, unknown>;
  sensitivity: 'low' | 'normal' | 'financial' | 'identity' | 'minor';
  permissionRequired: boolean;
}

export interface EloDecision {
  id: string;
  userId: string;
  decisionType: 'message' | 'recommendation' | 'warning' | 'automation' | 'explanation' | 'block';
  title?: string;
  body: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  sensitivity: 'low' | 'normal' | 'sensitive' | 'financial' | 'identity' | 'minor';
  reasonCodes: string[];
  sourceSignals: {
    wallet?: boolean;
    trust?: boolean;
    feed?: boolean;
    location?: boolean;
    creator?: boolean;
    externalPlatform?: boolean;
    declaredMemory?: boolean;
    inferredMemory?: boolean;
  };
  requiredPermission?: EloPermissionKey;
  targetAction?: EloAction;
  expiresAt?: string;
}

export interface EloRecommendation {
  id: string;
  type: 'wallet' | 'earn' | 'trust' | 'creator' | 'safety' | 'feed';
  title: string;
  body: string;
  reasonCodes: string[];
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  targetScreen: 'feed' | 'earn' | 'wallet' | 'profile' | 'studio' | 'campaign_builder';
  targetAction?: EloAction;
  requiresPermission: boolean;
}

export interface EloMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  createdAt: string;
}

export interface EloInsightCard {
  id: string;
  title: string;
  body: string;
  tone: 'guidance' | 'warning' | 'earning' | 'blocked' | 'celebrate';
  actionLabel?: string;
}

export interface EloNotification {
  id: string;
  type: 'opportunity' | 'reminder' | 'warning' | 'wallet' | 'trust' | 'creator';
  title: string;
  body: string;
  score: number;
}

