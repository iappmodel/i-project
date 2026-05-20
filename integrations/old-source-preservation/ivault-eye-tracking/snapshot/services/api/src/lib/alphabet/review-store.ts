import { REVIEW_RULES } from "../../data/alphabet/review-rules";
import type {
  ReviewCase,
  ReviewCaseStatus,
  ReviewDecision,
  ReviewEvaluationResult,
  ReviewerRole,
  ReviewReason,
  ReviewSignalInput,
  ReviewSubjectType
} from "../../types/alphabet/review.types";
import { evaluateReviewCase } from "./review-engine";

type ReviewStoreState = {
  cases: Map<string, ReviewCase>;
  results: Map<string, ReviewEvaluationResult>;
};

const store: ReviewStoreState = {
  cases: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addHours(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function getRule(subjectType: ReviewSubjectType) {
  return REVIEW_RULES.find(
    (rule) => rule.active && rule.subjectType === subjectType
  );
}

function mapOutcomeStatus(status: ReviewEvaluationResult["status"]): ReviewCaseStatus {
  switch (status) {
    case "review_created":
      return "case_created";
    case "review_needs_evidence":
      return "awaiting_evidence";
    case "review_queued":
      return "queued";
    case "review_assigned":
      return "assigned";
    case "review_in_progress":
      return "in_review";
    case "review_decided":
      return "decision_made";
    case "review_appealable":
      return "appealed";
    case "review_resolved":
      return "resolved";
    case "review_escalated":
      return "assigned";
    case "review_expired":
      return "expired";
    default:
      return "case_created";
  }
}

export function createReviewCase(params: {
  subjectType: ReviewSubjectType;
  subjectId: string;
  subjectOwnerUserId?: string | null;
  reason: ReviewReason;
  priority?: ReviewCase["priority"];
  evidencePacketId?: string | null;
  sourceEventIds?: string[];
  allowedAppealLimit?: number;
}): ReviewCase {
  const rule = getRule(params.subjectType);
  const now = nowIso();

  const reviewCase: ReviewCase = {
    reviewCaseId: createId("review_case"),
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    subjectOwnerUserId: params.subjectOwnerUserId ?? null,
    reason: params.reason,
    priority: params.priority ?? "normal",
    status: params.evidencePacketId ? "queued" : "awaiting_evidence",
    assignedReviewerRole: null,
    assignedReviewerUserId: null,
    decision: "none",
    decisionSummary: null,
    evidencePacketId: params.evidencePacketId ?? null,
    sourceEventIds: params.sourceEventIds ?? [],
    appealCount: 0,
    allowedAppealLimit:
      params.allowedAppealLimit ??
      rule?.defaultAllowedAppealLimit ??
      1,
    slaDeadlineAt: addHours(rule?.defaultSlaHours ?? 72),
    createdAt: now,
    updatedAt: now,
    assignedAt: null,
    startedAt: null,
    decidedAt: null,
    resolvedAt: null
  };

  store.cases.set(reviewCase.reviewCaseId, reviewCase);

  return reviewCase;
}

export function getReviewCase(reviewCaseId: string): ReviewCase | null {
  return store.cases.get(reviewCaseId) ?? null;
}

export function assignReviewCase(params: {
  reviewCaseId: string;
  reviewerRole: ReviewerRole;
  reviewerUserId: string;
}): ReviewCase {
  const reviewCase = getReviewCase(params.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const now = nowIso();

  const next: ReviewCase = {
    ...reviewCase,
    assignedReviewerRole: params.reviewerRole,
    assignedReviewerUserId: params.reviewerUserId,
    status: "assigned",
    assignedAt: now,
    updatedAt: now
  };

  store.cases.set(next.reviewCaseId, next);
  return next;
}

export function startReviewCase(reviewCaseId: string): ReviewCase {
  const reviewCase = getReviewCase(reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const now = nowIso();

  const next: ReviewCase = {
    ...reviewCase,
    status: "in_review",
    startedAt: reviewCase.startedAt ?? now,
    updatedAt: now
  };

  store.cases.set(next.reviewCaseId, next);
  return next;
}

export function attachReviewEvidence(params: {
  reviewCaseId: string;
  evidencePacketId: string;
  sourceEventIds?: string[];
}): ReviewCase {
  const reviewCase = getReviewCase(params.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const next: ReviewCase = {
    ...reviewCase,
    evidencePacketId: params.evidencePacketId,
    sourceEventIds: params.sourceEventIds ?? reviewCase.sourceEventIds,
    status: reviewCase.assignedReviewerUserId ? "assigned" : "queued",
    updatedAt: nowIso()
  };

  store.cases.set(next.reviewCaseId, next);
  return next;
}

export function recordReviewDecision(params: {
  reviewCaseId: string;
  decision: ReviewDecision;
  decisionSummary: string;
}): ReviewCase {
  const reviewCase = getReviewCase(params.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const now = nowIso();

  const next: ReviewCase = {
    ...reviewCase,
    decision: params.decision,
    decisionSummary: params.decisionSummary,
    status: "decision_made",
    decidedAt: now,
    updatedAt: now
  };

  store.cases.set(next.reviewCaseId, next);
  return next;
}

export function createReviewAppeal(params: {
  reviewCaseId: string;
  requesterUserId: string;
}): ReviewCase {
  const reviewCase = getReviewCase(params.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  if (reviewCase.appealCount >= reviewCase.allowedAppealLimit) {
    throw new Error("Appeal limit reached.");
  }

  const next: ReviewCase = {
    ...reviewCase,
    appealCount: reviewCase.appealCount + 1,
    status: "appealed",
    decision: "none",
    decisionSummary: null,
    updatedAt: nowIso()
  };

  store.cases.set(next.reviewCaseId, next);
  return next;
}

export function evaluateStoredReviewCase(
  input: Omit<
    ReviewSignalInput,
    | "reviewCaseId"
    | "subjectType"
    | "subjectId"
    | "subjectOwnerUserId"
    | "reason"
    | "priority"
    | "currentStatus"
    | "assignedReviewerRole"
    | "assignedReviewerUserId"
    | "decision"
    | "decisionSummary"
    | "evidencePacketId"
    | "sourceEventIds"
    | "appealCount"
    | "allowedAppealLimit"
    | "slaDeadlineAt"
    | "now"
  > & {
    reviewCaseId: string;
    now?: string;
  }
): ReviewEvaluationResult {
  const reviewCase = getReviewCase(input.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const result = evaluateReviewCase({
    ...input,
    reviewCaseId: reviewCase.reviewCaseId,
    subjectType: reviewCase.subjectType,
    subjectId: reviewCase.subjectId,
    subjectOwnerUserId: reviewCase.subjectOwnerUserId,
    reason: reviewCase.reason,
    priority: reviewCase.priority,
    currentStatus: reviewCase.status,
    assignedReviewerRole: reviewCase.assignedReviewerRole,
    assignedReviewerUserId: reviewCase.assignedReviewerUserId,
    decision: reviewCase.decision,
    decisionSummary: reviewCase.decisionSummary,
    evidencePacketId: reviewCase.evidencePacketId,
    sourceEventIds: reviewCase.sourceEventIds,
    appealCount: reviewCase.appealCount,
    allowedAppealLimit: reviewCase.allowedAppealLimit,
    slaDeadlineAt: reviewCase.slaDeadlineAt,
    now: input.now ?? nowIso(),
    metadata: {
      ...input.metadata
    }
  });

  const now = nowIso();

  const next: ReviewCase = {
    ...reviewCase,
    status: mapOutcomeStatus(result.status),
    resolvedAt: result.resolved ? now : reviewCase.resolvedAt,
    updatedAt: now
  };

  store.cases.set(next.reviewCaseId, next);
  store.results.set(result.reviewCaseId, result);

  return result;
}

export function listReviewCases(params?: {
  status?: ReviewCaseStatus;
  subjectOwnerUserId?: string;
  assignedReviewerUserId?: string;
}): ReviewCase[] {
  return Array.from(store.cases.values()).filter((reviewCase) => {
    if (params?.status && reviewCase.status !== params.status) return false;
    if (
      params?.subjectOwnerUserId &&
      reviewCase.subjectOwnerUserId !== params.subjectOwnerUserId
    ) {
      return false;
    }

    if (
      params?.assignedReviewerUserId &&
      reviewCase.assignedReviewerUserId !== params.assignedReviewerUserId
    ) {
      return false;
    }

    return true;
  });
}

export function getReviewEvaluationResult(
  reviewCaseId: string
): ReviewEvaluationResult | null {
  return store.results.get(reviewCaseId) ?? null;
}

export function resetReviewStoreForTests(): void {
  store.cases.clear();
  store.results.clear();
}
