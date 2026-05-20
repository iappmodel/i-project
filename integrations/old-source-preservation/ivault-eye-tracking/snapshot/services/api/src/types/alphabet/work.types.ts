import type { AlphabetEvent } from "./event.types";

export type WorkTaskContext =
  | "microtask"
  | "freelance"
  | "creator_service"
  | "local_service"
  | "learning_task"
  | "brand_task"
  | "moderation_task"
  | "marketplace_task"
  | "general_task";

export type WorkVerificationStatus =
  | "work_verified"
  | "exchange_verified"
  | "completed_needs_review"
  | "disputed"
  | "rejected"
  | "suspicious";

export type WorkTaskStatus =
  | "created"
  | "accepted"
  | "delivered"
  | "verified"
  | "exchange_verified"
  | "needs_review"
  | "disputed"
  | "rejected"
  | "suspicious"
  | "cancelled"
  | "expired";

export type WorkDisputeStatus =
  | "none"
  | "opened"
  | "worker_fault"
  | "client_fault"
  | "resolved_clean"
  | "unresolved";

export interface WorkTask {
  workTaskId: string;
  workerUserId: string;
  clientUserId?: string | null;
  businessId?: string | null;
  context: WorkTaskContext;
  objectType?: string | null;
  objectId?: string | null;
  taskValue: number;
  status: WorkTaskStatus;
  workerAgeBand: string;
  createdAt: string;
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  verifiedAt?: string | null;
  updatedAt: string;
}

export interface WorkSignalInput {
  workTaskId: string;
  workerUserId: string;
  clientUserId?: string | null;
  businessId?: string | null;
  context: WorkTaskContext;
  taskValue: number;
  delivered: boolean;
  clientConfirmed: boolean;
  deliveryDurationMs: number;
  clientSatisfactionScore: number;
  deliveryQualityScore: number;
  requirementMatchScore: number;
  timelinessScore: number;
  revisionScore: number;
  independentVerificationScore: number;
  systemValidationScore: number;
  disputeStatus: WorkDisputeStatus;
  escrowClean: boolean;
  paymentClean: boolean;
  fraudRisk: number;
  taskFarmingRisk: number;
  collusionRisk: number;
  chargebackRisk: number;
  refundAbuseRisk: number;
  deviceIntegrityScore: number;
  workerAgeBand: string;
  metadata?: Record<string, unknown>;
}

export interface WorkRuleSet {
  context: WorkTaskContext;
  minTaskValue: number;
  minDeliveryDurationMs: number;
  minClientSatisfactionScore: number;
  minDeliveryQualityScore: number;
  minRequirementMatchScore: number;
  minWorkScore: number;
  minExchangeScore: number;
  minQualityScore: number;
  maxRiskScore: number;
  maxFraudRisk: number;
  maxCollusionRisk: number;
  maxChargebackRisk: number;
  allowsUnder13Worker: boolean;
  allowsTeenWorker: boolean;
  requiresClientConfirmation: boolean;
  requiresCleanPayment: boolean;
  active: boolean;
}

export interface WorkVerificationResult {
  workTaskId: string;
  workerUserId: string;
  clientUserId?: string | null;
  businessId?: string | null;
  status: WorkVerificationStatus;
  workScore: number;
  exchangeScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
  workDeliveredEvent: AlphabetEvent;
  workVerifiedEvent?: AlphabetEvent | null;
  exchangeCompletedEvent?: AlphabetEvent | null;
  disputeEvent?: AlphabetEvent | null;
  fraudEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
