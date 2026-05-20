import type { AlphabetEvent } from "./event.types";

export type CreationArtifactType =
  | "video"
  | "image"
  | "text"
  | "audio"
  | "course"
  | "tool"
  | "design"
  | "code"
  | "mixed_media";

export type CreationVerificationStatus =
  | "creation_verified"
  | "originality_verified"
  | "quality_verified"
  | "needs_review"
  | "rejected"
  | "suspicious";

export type CreationArtifactStatus =
  | "submitted"
  | "rights_checked"
  | "originality_scored"
  | "quality_scored"
  | "verified"
  | "needs_review"
  | "rejected"
  | "suspicious";

export interface CreationArtifact {
  artifactId: string;
  userId: string;
  creatorId: string;
  artifactType: CreationArtifactType;
  title?: string | null;
  description?: string | null;
  aiAssisted: boolean;
  aiDisclosed: boolean;
  status: CreationArtifactStatus;
  ageBand: string;
  submittedAt: string;
  updatedAt: string;
}

export interface CreationSignalInput {
  artifactId: string;
  userId: string;
  creatorId: string;
  artifactType: CreationArtifactType;
  artifactExists: boolean;
  rightsScore: number;
  originalityScore: number;
  remixScore: number;
  qualityScore: number;
  usefulnessScore: number;
  effortScore: number;
  audienceValueScore: number;
  aiAssisted: boolean;
  aiDisclosed: boolean;
  plagiarismRisk: number;
  copyrightRisk: number;
  aiSpamRisk: number;
  duplicateContentRisk: number;
  manipulationRisk: number;
  deviceIntegrityScore: number;
  ageBand: string;
  metadata?: Record<string, unknown>;
}

export interface CreationRuleSet {
  artifactType: CreationArtifactType;
  minRightsScore: number;
  minOriginalityScore: number;
  minQualityScore: number;
  minCreationScore: number;
  minUsefulnessScore: number;
  minEffortScore: number;
  maxRiskScore: number;
  maxPlagiarismRisk: number;
  maxCopyrightRisk: number;
  maxAiSpamRisk: number;
  allowAiAssisted: boolean;
  requireAiDisclosure: boolean;
  under13Allowed: boolean;
  teenAllowed: boolean;
  active: boolean;
}

export interface CreationVerificationResult {
  artifactId: string;
  userId: string;
  creatorId: string;
  status: CreationVerificationStatus;
  creationScore: number;
  finalOriginalityScore: number;
  finalQualityScore: number;
  riskScore: number;
  reasons: string[];
  submittedEvent: AlphabetEvent;
  rightsCheckedEvent?: AlphabetEvent | null;
  originalityScoredEvent?: AlphabetEvent | null;
  qualityScoredEvent?: AlphabetEvent | null;
  cCoinEvent?: AlphabetEvent | null;
  oCoinEvent?: AlphabetEvent | null;
  qCoinEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
