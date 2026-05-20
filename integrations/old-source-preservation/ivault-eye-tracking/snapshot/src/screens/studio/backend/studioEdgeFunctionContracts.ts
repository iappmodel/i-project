/**
 * Edge Function contracts (Stage 9) — implementation is Stage 10+.
 */

export type AuthorityDomain =
  | "storage"
  | "publish"
  | "safety"
  | "rights"
  | "wallet"
  | "campaign"
  | "verification"
  | "fraud"
  | "pops"
  | "dispute"
  | "analytics";

export type EdgeRiskLevel = "low" | "medium" | "high" | "critical";

export interface StudioEdgeFunctionContract {
  name: string;
  purpose: string;
  requestTypeName: string;
  responseTypeName: string;
  authorityDomain: AuthorityDomain;
  requiresAuth: boolean;
  requiresServiceRole: boolean;
  idempotencyRequired: boolean;
  riskLevel: EdgeRiskLevel;
}

export const STUDIO_EDGE_FUNCTION_CONTRACTS: StudioEdgeFunctionContract[] = [
  { name: "create-upload-intent", purpose: "Signed upload URL / storage path", requestTypeName: "UploadIntentRequest", responseTypeName: "UploadIntentResponse", authorityDomain: "storage", requiresAuth: true, requiresServiceRole: false, idempotencyRequired: true, riskLevel: "medium" },
  { name: "confirm-upload", purpose: "Finalize asset after blob lands", requestTypeName: "ConfirmUploadRequest", responseTypeName: "ConfirmUploadResponse", authorityDomain: "storage", requiresAuth: true, requiresServiceRole: false, idempotencyRequired: true, riskLevel: "medium" },
  { name: "run-safety-scan", purpose: "Server safety classification", requestTypeName: "SafetyScanRequest", responseTypeName: "SafetyScanResponse", authorityDomain: "safety", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: false, riskLevel: "high" },
  { name: "run-rights-scan", purpose: "Rights / monetization eligibility", requestTypeName: "RightsScanRequest", responseTypeName: "RightsScanResponse", authorityDomain: "rights", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: false, riskLevel: "high" },
  { name: "validate-publish", purpose: "Gate publish preconditions", requestTypeName: "ValidatePublishRequest", responseTypeName: "ValidatePublishResponse", authorityDomain: "publish", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "high" },
  { name: "create-export-job", purpose: "Queue media export", requestTypeName: "CreateExportJobRequest", responseTypeName: "CreateExportJobResponse", authorityDomain: "publish", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "medium" },
  { name: "complete-export-job", purpose: "Mark export done + checksums", requestTypeName: "CompleteExportJobRequest", responseTypeName: "CompleteExportJobResponse", authorityDomain: "publish", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "medium" },
  { name: "publish-post", purpose: "Immutable post package activation", requestTypeName: "PublishPostRequest", responseTypeName: "PublishPostResponse", authorityDomain: "publish", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "confirm-magic-unlock", purpose: "Verify payment + issue unlock token", requestTypeName: "ConfirmMagicUnlockRequest", responseTypeName: "ConfirmMagicUnlockResponse", authorityDomain: "wallet", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "create-ledger-transaction", purpose: "Append-only ledger lines", requestTypeName: "LedgerTransactionRequest", responseTypeName: "LedgerTransactionResponse", authorityDomain: "wallet", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "release-settlement", purpose: "Move held funds per policy", requestTypeName: "ReleaseSettlementRequest", responseTypeName: "ReleaseSettlementResponse", authorityDomain: "wallet", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "reverse-settlement", purpose: "Compensating ledger entries", requestTypeName: "ReverseSettlementRequest", responseTypeName: "ReverseSettlementResponse", authorityDomain: "wallet", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "validate-campaign", purpose: "Campaign structure + caps check", requestTypeName: "ValidateCampaignRequest", responseTypeName: "ValidateCampaignResponse", authorityDomain: "campaign", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: false, riskLevel: "high" },
  { name: "activate-campaign", purpose: "Reserve budget / open campaign", requestTypeName: "ActivateCampaignRequest", responseTypeName: "ActivateCampaignResponse", authorityDomain: "campaign", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "verify-campaign-action", purpose: "Attestation for reward claim", requestTypeName: "VerifyCampaignActionRequest", responseTypeName: "VerifyCampaignActionResponse", authorityDomain: "campaign", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "pay-campaign-reward", purpose: "Issue reward via ledger", requestTypeName: "PayCampaignRewardRequest", responseTypeName: "PayCampaignRewardResponse", authorityDomain: "wallet", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "run-verification", purpose: "Human / doc verification pipeline", requestTypeName: "RunVerificationRequest", responseTypeName: "RunVerificationResponse", authorityDomain: "verification", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: false, riskLevel: "high" },
  { name: "run-fraud-assessment", purpose: "Fraud model + rules (non-client final)", requestTypeName: "RunFraudAssessmentRequest", responseTypeName: "RunFraudAssessmentResponse", authorityDomain: "fraud", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: false, riskLevel: "critical" },
  { name: "create-pops-challenge", purpose: "Multimodal presence challenge", requestTypeName: "CreatePOPSRequest", responseTypeName: "CreatePOPSResponse", authorityDomain: "pops", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "high" },
  { name: "complete-pops-challenge", purpose: "Grade challenge outcome", requestTypeName: "CompletePOPSRequest", responseTypeName: "CompletePOPSResponse", authorityDomain: "pops", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
  { name: "create-dispute", purpose: "Open dispute (user intent)", requestTypeName: "CreateDisputeRequest", responseTypeName: "CreateDisputeResponse", authorityDomain: "dispute", requiresAuth: true, requiresServiceRole: false, idempotencyRequired: true, riskLevel: "medium" },
  { name: "resolve-dispute", purpose: "Arbitration outcome + ledger hooks", requestTypeName: "ResolveDisputeRequest", responseTypeName: "ResolveDisputeResponse", authorityDomain: "dispute", requiresAuth: true, requiresServiceRole: true, idempotencyRequired: true, riskLevel: "critical" },
];
