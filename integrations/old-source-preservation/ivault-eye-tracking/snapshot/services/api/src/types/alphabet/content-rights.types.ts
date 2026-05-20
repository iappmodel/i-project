import type { AlphabetEvent } from "./event.types";

export type ContentType =
  | "video"
  | "image"
  | "audio"
  | "text"
  | "course"
  | "livestream"
  | "remix"
  | "template"
  | "dataset"
  | "software"
  | "mixed_media";

export type RightsClaimType =
  | "original"
  | "licensed"
  | "collaborative"
  | "remix"
  | "fair_use_claim"
  | "public_domain"
  | "ai_assisted"
  | "unknown";

export type LicenseStatus =
  | "none"
  | "claimed"
  | "verified"
  | "expired"
  | "disputed"
  | "rejected";

export type ContentRightsStatus =
  | "rights_created"
  | "rights_verified"
  | "rights_limited"
  | "rights_pending_review"
  | "rights_disputed"
  | "rights_rejected"
  | "rights_blocked";

export type ContentSafetyStatus =
  | "clear"
  | "limited"
  | "pending_review"
  | "blocked"
  | "removed";

export interface AttributionRecipient {
  userId: string;
  creatorId?: string | null;
  role:
    | "primary_creator"
    | "collaborator"
    | "editor"
    | "producer"
    | "source_author"
    | "licensor"
    | "ai_tool"
    | "other";
  attributionRate: number;
  evidenceScore: number;
}

export interface ExternalSourceReference {
  sourceId: string;
  url?: string | null;
  title?: string | null;
  author?: string | null;
  licenseName?: string | null;
  similarityScore: number;
  transformationScore: number;
}

export interface LicenseEvidence {
  evidenceId: string;
  licenseName: string;
  licensor?: string | null;
  licenseUrl?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  evidenceScore: number;
  verified: boolean;
}

export interface ContentRightsRecord {
  contentRightsId: string;
  contentId: string;
  creatorId: string;
  userId: string;
  contentType: ContentType;
  rightsClaimType: RightsClaimType;
  licenseStatus: LicenseStatus;
  safetyStatus: ContentSafetyStatus;
  originalityScore: number;
  attributionConfidenceScore: number;
  transformationScore: number;
  similarityScore: number;
  knownSourceOverlapScore: number;
  aiAssisted: boolean;
  aiAssistanceDisclosed: boolean;
  collaborators: AttributionRecipient[];
  externalSources: ExternalSourceReference[];
  licenseEvidence: LicenseEvidence[];
  status: ContentRightsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContentRightsSignalInput {
  contentRightsId: string;
  contentId: string;
  creatorId: string;
  userId: string;
  contentType: ContentType;
  rightsClaimType: RightsClaimType;
  licenseStatus: LicenseStatus;
  safetyStatus: ContentSafetyStatus;
  originalityScore: number;
  attributionConfidenceScore: number;
  transformationScore: number;
  similarityScore: number;
  knownSourceOverlapScore: number;
  collaborators: AttributionRecipient[];
  externalSources: ExternalSourceReference[];
  licenseEvidence: LicenseEvidence[];
  aiAssisted: boolean;
  aiAssistanceDisclosed: boolean;
  copyrightRisk: number;
  plagiarismRisk: number;
  impersonationRisk: number;
  monetizationRisk: number;
  safetyRisk: number;
  creatorTrustScore: number;
  creatorUValueScore: number;
  disputeOpened: boolean;
  takedownNoticeReceived: boolean;
  manualReviewRequested: boolean;
  monetizationRequested: boolean;
  metadata?: Record<string, unknown>;
}

export interface ContentRightsRuleSet {
  rightsClaimType: RightsClaimType;
  minRightsConfidenceScore: number;
  minOriginalityConfidenceScore: number;
  minAttributionIntegrityScore: number;
  minMonetizationEligibilityScore: number;
  minOriginalityScore: number;
  minTransformationScore: number;
  minAttributionConfidenceScore: number;
  maxSimilarityScore: number;
  maxKnownSourceOverlapScore: number;
  maxCopyrightRisk: number;
  maxPlagiarismRisk: number;
  maxImpersonationRisk: number;
  maxMonetizationRisk: number;
  maxSafetyRisk: number;
  requiresLicenseEvidence: boolean;
  requiresAttributionEvidence: boolean;
  requiresAiDisclosure: boolean;
  allowsMonetization: boolean;
  requiresManualReview: boolean;
  active: boolean;
}

export interface ContentRightsResult {
  contentRightsId: string;
  contentId: string;
  creatorId: string;
  userId: string;
  contentType: ContentType;
  rightsClaimType: RightsClaimType;
  licenseStatus: LicenseStatus;
  status: ContentRightsStatus;
  rightsConfidenceScore: number;
  originalityConfidenceScore: number;
  attributionIntegrityScore: number;
  monetizationEligibilityScore: number;
  copyrightRisk: number;
  plagiarismRisk: number;
  impersonationRisk: number;
  monetizationRisk: number;
  safetyRisk: number;
  monetizationApproved: boolean;
  monetizationBlocked: boolean;
  payoutQualityMultiplier: number;
  requiresReview: boolean;
  disputeRequired: boolean;
  attributionGraphValid: boolean;
  reasons: string[];
  contentRightsCreatedEvent: AlphabetEvent;
  contentOriginalityVerifiedEvent?: AlphabetEvent | null;
  contentAttributionVerifiedEvent?: AlphabetEvent | null;
  contentRightsLimitedEvent?: AlphabetEvent | null;
  contentRightsDisputedEvent?: AlphabetEvent | null;
  contentRightsRejectedEvent?: AlphabetEvent | null;
  contentMonetizationApprovedEvent?: AlphabetEvent | null;
  contentMonetizationBlockedEvent?: AlphabetEvent | null;
  contentCopyrightRiskDetectedEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
