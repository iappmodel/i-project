import { CONTENT_RIGHTS_RULES } from "../../data/alphabet/content-rights-rules";
import type { AlphabetEvent } from "../../types/alphabet/event.types";
import type {
  AttributionRecipient,
  ContentRightsResult,
  ContentRightsRuleSet,
  ContentRightsSignalInput,
  ContentRightsStatus
} from "../../types/alphabet/content-rights.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(4))));
}

function findRule(input: ContentRightsSignalInput): ContentRightsRuleSet | undefined {
  return CONTENT_RIGHTS_RULES.find(
    (rule) => rule.active && rule.rightsClaimType === input.rightsClaimType
  );
}

function hasVerifiedLicenseEvidence(input: ContentRightsSignalInput): boolean {
  return input.licenseEvidence.some(
    (evidence) => evidence.verified && evidence.evidenceScore >= 0.7
  );
}

function hasValidAttribution(input: ContentRightsSignalInput): boolean {
  if (input.collaborators.length === 0) return false;

  const totalRate = input.collaborators.reduce(
    (sum, collaborator) => sum + collaborator.attributionRate,
    0
  );

  const avgEvidence =
    input.collaborators.reduce(
      (sum, collaborator) => sum + collaborator.evidenceScore,
      0
    ) / input.collaborators.length;

  const primaryCreatorExists = input.collaborators.some(
    (collaborator) => collaborator.role === "primary_creator"
  );

  return totalRate <= 1.000001 && avgEvidence >= 0.6 && primaryCreatorExists;
}

function calculateAttributionIntegrityScore(input: ContentRightsSignalInput): number {
  if (input.collaborators.length === 0) return 0;

  const totalRate = input.collaborators.reduce(
    (sum, collaborator) => sum + collaborator.attributionRate,
    0
  );

  const rateScore = totalRate <= 1 ? 1 : clamp(1 / totalRate);

  const avgEvidence =
    input.collaborators.reduce(
      (sum, collaborator) => sum + collaborator.evidenceScore,
      0
    ) / input.collaborators.length;

  const primaryCreatorScore = input.collaborators.some(
    (collaborator) => collaborator.role === "primary_creator"
  )
    ? 1
    : 0;

  const sourceAttributionScore =
    input.externalSources.length === 0
      ? 1
      : clamp(
          input.externalSources.reduce((sum, source) => {
            const hasBasicReference = source.url || source.title || source.author;
            return sum + (hasBasicReference ? 1 : 0.4);
          }, 0) / input.externalSources.length
        );

  return clamp(
    rateScore * 0.3 +
      clamp(avgEvidence) * 0.3 +
      primaryCreatorScore * 0.2 +
      sourceAttributionScore * 0.2
  );
}

function calculateOriginalityConfidenceScore(input: ContentRightsSignalInput): number {
  const originality = clamp(input.originalityScore);
  const transformation = clamp(input.transformationScore);
  const similarityPenalty = 1 - clamp(input.similarityScore);
  const sourceOverlapPenalty = 1 - clamp(input.knownSourceOverlapScore);

  return clamp(
    originality * 0.35 +
      transformation * 0.2 +
      similarityPenalty * 0.25 +
      sourceOverlapPenalty * 0.2
  );
}

function calculateRightsConfidenceScore(input: ContentRightsSignalInput): number {
  const licenseScore =
    input.licenseStatus === "verified"
      ? 1
      : input.licenseStatus === "claimed"
        ? 0.55
        : input.licenseStatus === "none"
          ? 0.35
          : 0.1;

  const evidenceScore =
    input.licenseEvidence.length === 0
      ? 0.4
      : clamp(
          input.licenseEvidence.reduce((sum, evidence) => {
            return sum + evidence.evidenceScore * (evidence.verified ? 1 : 0.6);
          }, 0) / input.licenseEvidence.length
        );

  const attributionIntegrityScore = calculateAttributionIntegrityScore(input);
  const originalityConfidenceScore = calculateOriginalityConfidenceScore(input);

  const aiDisclosureScore =
    input.aiAssisted && !input.aiAssistanceDisclosed ? 0.2 : 1;

  return clamp(
    licenseScore * 0.2 +
      evidenceScore * 0.2 +
      attributionIntegrityScore * 0.25 +
      originalityConfidenceScore * 0.25 +
      aiDisclosureScore * 0.1
  );
}

function calculateMonetizationEligibilityScore(input: ContentRightsSignalInput): number {
  const rightsConfidenceScore = calculateRightsConfidenceScore(input);
  const originalityConfidenceScore = calculateOriginalityConfidenceScore(input);
  const attributionIntegrityScore = calculateAttributionIntegrityScore(input);

  const riskScore =
    clamp(input.copyrightRisk) * 0.24 +
    clamp(input.plagiarismRisk) * 0.2 +
    clamp(input.impersonationRisk) * 0.16 +
    clamp(input.monetizationRisk) * 0.2 +
    clamp(input.safetyRisk) * 0.2;

  const creatorScore =
    clamp(input.creatorTrustScore / 100) * 0.6 +
    clamp(input.creatorUValueScore / 100) * 0.4;

  return clamp(
    rightsConfidenceScore * 0.3 +
      originalityConfidenceScore * 0.2 +
      attributionIntegrityScore * 0.2 +
      creatorScore * 0.15 +
      (1 - riskScore) * 0.15
  );
}

function payoutQualityMultiplierFromScore(score: number): number {
  if (score >= 0.9) return 1.15;
  if (score >= 0.8) return 1.05;
  if (score >= 0.7) return 1;
  if (score >= 0.6) return 0.85;
  if (score >= 0.5) return 0.65;
  return 0;
}

function decideContentRightsStatus(params: {
  input: ContentRightsSignalInput;
  rule: ContentRightsRuleSet;
  rightsConfidenceScore: number;
  originalityConfidenceScore: number;
  attributionIntegrityScore: number;
  monetizationEligibilityScore: number;
  reasons: string[];
}): ContentRightsStatus {
  const {
    input,
    rule,
    rightsConfidenceScore,
    originalityConfidenceScore,
    attributionIntegrityScore,
    monetizationEligibilityScore,
    reasons
  } = params;

  if (input.takedownNoticeReceived) {
    reasons.push("takedown_notice_received");
    return "rights_blocked";
  }

  if (input.disputeOpened) {
    reasons.push("rights_dispute_opened");
    return "rights_disputed";
  }

  if (input.safetyStatus === "blocked" || input.safetyStatus === "removed") {
    reasons.push("content_safety_blocked");
    return "rights_blocked";
  }

  if (input.licenseStatus === "disputed") {
    reasons.push("license_disputed");
    return "rights_disputed";
  }

  if (input.licenseStatus === "rejected") {
    reasons.push("license_rejected");
    return "rights_rejected";
  }

  if (input.licenseStatus === "expired") {
    reasons.push("license_expired");
    return "rights_limited";
  }

  if (rule.requiresLicenseEvidence && !hasVerifiedLicenseEvidence(input)) {
    reasons.push("verified_license_evidence_required");
    return "rights_pending_review";
  }

  if (rule.requiresAttributionEvidence && !hasValidAttribution(input)) {
    reasons.push("valid_attribution_required");
    return "rights_pending_review";
  }

  if (rule.requiresAiDisclosure && input.aiAssisted && !input.aiAssistanceDisclosed) {
    reasons.push("ai_assistance_disclosure_required");
    return "rights_limited";
  }

  if (input.originalityScore < rule.minOriginalityScore) {
    reasons.push("originality_score_below_minimum");
    return "rights_pending_review";
  }

  if (input.transformationScore < rule.minTransformationScore) {
    reasons.push("transformation_score_below_minimum");
    return "rights_pending_review";
  }

  if (input.attributionConfidenceScore < rule.minAttributionConfidenceScore) {
    reasons.push("attribution_confidence_below_minimum");
    return "rights_pending_review";
  }

  if (input.similarityScore > rule.maxSimilarityScore) {
    reasons.push("similarity_score_above_maximum");
    return "rights_limited";
  }

  if (input.knownSourceOverlapScore > rule.maxKnownSourceOverlapScore) {
    reasons.push("known_source_overlap_above_maximum");
    return "rights_limited";
  }

  if (input.copyrightRisk > rule.maxCopyrightRisk) {
    reasons.push("copyright_risk_above_maximum");
    return input.copyrightRisk > 0.75 ? "rights_blocked" : "rights_pending_review";
  }

  if (input.plagiarismRisk > rule.maxPlagiarismRisk) {
    reasons.push("plagiarism_risk_above_maximum");
    return input.plagiarismRisk > 0.75 ? "rights_blocked" : "rights_pending_review";
  }

  if (input.impersonationRisk > rule.maxImpersonationRisk) {
    reasons.push("impersonation_risk_above_maximum");
    return input.impersonationRisk > 0.7 ? "rights_blocked" : "rights_pending_review";
  }

  if (input.monetizationRisk > rule.maxMonetizationRisk) {
    reasons.push("monetization_risk_above_maximum");
    return "rights_pending_review";
  }

  if (input.safetyRisk > rule.maxSafetyRisk) {
    reasons.push("safety_risk_above_maximum");
    return "rights_limited";
  }

  if (rightsConfidenceScore < rule.minRightsConfidenceScore) {
    reasons.push("rights_confidence_below_minimum");
    return "rights_pending_review";
  }

  if (originalityConfidenceScore < rule.minOriginalityConfidenceScore) {
    reasons.push("originality_confidence_below_minimum");
    return "rights_pending_review";
  }

  if (attributionIntegrityScore < rule.minAttributionIntegrityScore) {
    reasons.push("attribution_integrity_below_minimum");
    return "rights_pending_review";
  }

  if (input.manualReviewRequested || rule.requiresManualReview) {
    reasons.push("manual_review_required");
    return "rights_pending_review";
  }

  if (
    input.monetizationRequested &&
    (!rule.allowsMonetization ||
      monetizationEligibilityScore < rule.minMonetizationEligibilityScore)
  ) {
    reasons.push("monetization_not_eligible");
    return "rights_limited";
  }

  reasons.push("rights_verified");
  return "rights_verified";
}

function createContentRightsAlphabetEvent(params: {
  input: ContentRightsSignalInput;
  eventType: AlphabetEvent["eventType"];
  rawScore: number;
  qualityScore: number;
  riskScore: number;
  verificationStatus: AlphabetEvent["verificationStatus"];
  metadata?: Record<string, unknown>;
}): AlphabetEvent {
  return {
    eventId: createId("alphabet_event"),
    userId: params.input.userId,
    coinCode: "O",
    eventType: params.eventType,
    objectType: "content_rights",
    objectId: params.input.contentRightsId,
    sourceContext: "content",
    rawScore: params.rawScore,
    qualityScore: params.qualityScore,
    trustScoreAtEvent: params.input.creatorTrustScore,
    riskScore: params.riskScore,
    ageBand: "18_plus",
    verificationStatus: params.verificationStatus,
    metadata: {
      contentRightsId: params.input.contentRightsId,
      contentId: params.input.contentId,
      creatorId: params.input.creatorId,
      contentType: params.input.contentType,
      rightsClaimType: params.input.rightsClaimType,
      licenseStatus: params.input.licenseStatus,
      safetyStatus: params.input.safetyStatus,
      aiAssisted: params.input.aiAssisted,
      aiAssistanceDisclosed: params.input.aiAssistanceDisclosed,
      ...params.metadata,
      ...params.input.metadata
    },
    createdAt: new Date().toISOString()
  };
}

export function evaluateContentRights(input: ContentRightsSignalInput): ContentRightsResult {
  const reasons: string[] = [];
  const rule = findRule(input);

  const rightsConfidenceScore = calculateRightsConfidenceScore(input);
  const originalityConfidenceScore = calculateOriginalityConfidenceScore(input);
  const attributionIntegrityScore = calculateAttributionIntegrityScore(input);
  const monetizationEligibilityScore = calculateMonetizationEligibilityScore(input);

  const riskScore = clamp(
    input.copyrightRisk * 0.3 +
      input.plagiarismRisk * 0.2 +
      input.impersonationRisk * 0.15 +
      input.monetizationRisk * 0.2 +
      input.safetyRisk * 0.15
  );

  if (!rule) {
    reasons.push("no_active_content_rights_rule");

    const contentRightsCreatedEvent = createContentRightsAlphabetEvent({
      input,
      eventType: "content_rights_created",
      rawScore: rightsConfidenceScore,
      qualityScore: originalityConfidenceScore,
      riskScore,
      verificationStatus: "rejected",
      metadata: { reasons }
    });

    return {
      contentRightsId: input.contentRightsId,
      contentId: input.contentId,
      creatorId: input.creatorId,
      userId: input.userId,
      contentType: input.contentType,
      rightsClaimType: input.rightsClaimType,
      licenseStatus: input.licenseStatus,
      status: "rights_rejected",
      rightsConfidenceScore,
      originalityConfidenceScore,
      attributionIntegrityScore,
      monetizationEligibilityScore,
      copyrightRisk: input.copyrightRisk,
      plagiarismRisk: input.plagiarismRisk,
      impersonationRisk: input.impersonationRisk,
      monetizationRisk: input.monetizationRisk,
      safetyRisk: input.safetyRisk,
      monetizationApproved: false,
      monetizationBlocked: true,
      payoutQualityMultiplier: 0,
      requiresReview: true,
      disputeRequired: false,
      attributionGraphValid: false,
      reasons,
      contentRightsCreatedEvent,
      contentOriginalityVerifiedEvent: null,
      contentAttributionVerifiedEvent: null,
      contentRightsLimitedEvent: null,
      contentRightsDisputedEvent: null,
      contentRightsRejectedEvent: contentRightsCreatedEvent,
      contentMonetizationApprovedEvent: null,
      contentMonetizationBlockedEvent: contentRightsCreatedEvent,
      contentCopyrightRiskDetectedEvent: contentRightsCreatedEvent,
      metadata: input.metadata ?? {}
    };
  }

  const status = decideContentRightsStatus({
    input,
    rule,
    rightsConfidenceScore,
    originalityConfidenceScore,
    attributionIntegrityScore,
    monetizationEligibilityScore,
    reasons
  });

  const monetizationApproved =
    input.monetizationRequested &&
    status === "rights_verified" &&
    rule.allowsMonetization &&
    monetizationEligibilityScore >= rule.minMonetizationEligibilityScore;

  const monetizationBlocked =
    input.monetizationRequested &&
    (status === "rights_rejected" ||
      status === "rights_blocked" ||
      !rule.allowsMonetization ||
      monetizationEligibilityScore < rule.minMonetizationEligibilityScore);

  const requiresReview =
    status === "rights_pending_review" ||
    status === "rights_limited" ||
    status === "rights_disputed";

  const disputeRequired = status === "rights_disputed";

  const attributionGraphValid =
    attributionIntegrityScore >= rule.minAttributionIntegrityScore &&
    hasValidAttribution(input);

  const payoutQualityMultiplier = monetizationApproved
    ? payoutQualityMultiplierFromScore(monetizationEligibilityScore)
    : 0;

  const verificationStatus =
    status === "rights_verified" || status === "rights_limited"
      ? "verified"
      : "rejected";

  const contentRightsCreatedEvent = createContentRightsAlphabetEvent({
    input,
    eventType: "content_rights_created",
    rawScore: rightsConfidenceScore,
    qualityScore: originalityConfidenceScore,
    riskScore,
    verificationStatus,
    metadata: { status, reasons }
  });

  const contentOriginalityVerifiedEvent =
    originalityConfidenceScore >= rule.minOriginalityConfidenceScore
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_originality_verified",
          rawScore: input.originalityScore,
          qualityScore: originalityConfidenceScore,
          riskScore,
          verificationStatus: "verified",
          metadata: { status, reasons }
        })
      : null;

  const contentAttributionVerifiedEvent =
    attributionGraphValid
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_attribution_verified",
          rawScore: input.attributionConfidenceScore,
          qualityScore: attributionIntegrityScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            collaborators: input.collaborators,
            externalSources: input.externalSources,
            reasons
          }
        })
      : null;

  const contentRightsLimitedEvent =
    status === "rights_limited" || status === "rights_pending_review"
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_rights_limited",
          rawScore: rightsConfidenceScore,
          qualityScore: monetizationEligibilityScore,
          riskScore,
          verificationStatus,
          metadata: { status, reasons }
        })
      : null;

  const contentRightsDisputedEvent =
    status === "rights_disputed"
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_rights_disputed",
          rawScore: rightsConfidenceScore,
          qualityScore: attributionIntegrityScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const contentRightsRejectedEvent =
    status === "rights_rejected" || status === "rights_blocked"
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_rights_rejected",
          rawScore: rightsConfidenceScore,
          qualityScore: originalityConfidenceScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const contentMonetizationApprovedEvent =
    monetizationApproved
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_monetization_approved",
          rawScore: monetizationEligibilityScore,
          qualityScore: originalityConfidenceScore,
          riskScore,
          verificationStatus: "verified",
          metadata: {
            status,
            payoutQualityMultiplier,
            reasons
          }
        })
      : null;

  const contentMonetizationBlockedEvent =
    monetizationBlocked
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_monetization_blocked",
          rawScore: monetizationEligibilityScore,
          qualityScore: rightsConfidenceScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  const contentCopyrightRiskDetectedEvent =
    input.copyrightRisk > rule.maxCopyrightRisk ||
    input.plagiarismRisk > rule.maxPlagiarismRisk ||
    status === "rights_blocked"
      ? createContentRightsAlphabetEvent({
          input,
          eventType: "content_copyright_risk_detected",
          rawScore: riskScore,
          qualityScore: rightsConfidenceScore,
          riskScore,
          verificationStatus: "rejected",
          metadata: { status, reasons }
        })
      : null;

  return {
    contentRightsId: input.contentRightsId,
    contentId: input.contentId,
    creatorId: input.creatorId,
    userId: input.userId,
    contentType: input.contentType,
    rightsClaimType: input.rightsClaimType,
    licenseStatus: input.licenseStatus,
    status,
    rightsConfidenceScore,
    originalityConfidenceScore,
    attributionIntegrityScore,
    monetizationEligibilityScore,
    copyrightRisk: input.copyrightRisk,
    plagiarismRisk: input.plagiarismRisk,
    impersonationRisk: input.impersonationRisk,
    monetizationRisk: input.monetizationRisk,
    safetyRisk: input.safetyRisk,
    monetizationApproved,
    monetizationBlocked,
    payoutQualityMultiplier,
    requiresReview,
    disputeRequired,
    attributionGraphValid,
    reasons,
    contentRightsCreatedEvent,
    contentOriginalityVerifiedEvent,
    contentAttributionVerifiedEvent,
    contentRightsLimitedEvent,
    contentRightsDisputedEvent,
    contentRightsRejectedEvent,
    contentMonetizationApprovedEvent,
    contentMonetizationBlockedEvent,
    contentCopyrightRiskDetectedEvent,
    metadata: {
      ruleRightsClaimType: rule.rightsClaimType,
      ...input.metadata
    }
  };
}

export function normalizeAttributionRecipients(
  recipients: AttributionRecipient[]
): AttributionRecipient[] {
  const total = recipients.reduce(
    (sum, recipient) => sum + recipient.attributionRate,
    0
  );

  if (total <= 0) return recipients;

  return recipients.map((recipient) => ({
    ...recipient,
    attributionRate: Number((recipient.attributionRate / total).toFixed(6))
  }));
}
