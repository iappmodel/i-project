import type { ActionIntentType } from "./action-intent.types";

export interface ActionApiAuthContext {
  authenticatedUserId: string | null;
  actorUserId: string | null;
  sessionId?: string | null;
  deviceId?: string | null;
  clientRequestId?: string | null;
  ipRegionCode?: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isSystem: boolean;
}

export interface ActionApiRequestPayload {
  userId?: string | null;
  actorUserId?: string | null;
  intentType?: ActionIntentType | string | null;
  requestSource?: string | null;
  requestChannel?: string | null;
  surface?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  walletId?: string | null;
  contentId?: string | null;
  campaignId?: string | null;
  grantEligibilityId?: string | null;
  creatorId?: string | null;
  businessId?: string | null;
  amount?: number | null;
  coinCode?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
}

export type ActionApiUserActionType =
  | "none"
  | "retry"
  | "wait_for_review"
  | "authenticate";

export interface ActionApiPublicResponse {
  ok: boolean;
  status: string;
  actionIntentId: string | null;
  pipelineId: string | null;
  allowedToContinue: boolean;
  requiresUserAction: boolean;
  userActionType: ActionApiUserActionType;
  message: string;
  requestId: string;
}

export interface ActionApiLinkedPipelineResponse {
  pipelineId: string;
  status: string;
  allowedToContinue: boolean;
  requiresUserAction: boolean;
  userActionType: ActionApiUserActionType;
  publicMessage: string;
  internalReasonCodes: string[];
  policyDecisionId: string | null;
  sagaId: string | null;
  executionRequestIds: string[];
}

export interface ActionApiInternalResponse {
  requestId: string;
  reasons: string[];
  linkedPipelineResponse: ActionApiLinkedPipelineResponse | null;
  riskHints?: Record<string, unknown>;
}
