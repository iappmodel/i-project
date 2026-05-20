import type {
  AdminReviewResult,
  AppealStatus,
  ReviewCase,
  ReviewEvidencePacket,
  ReviewPriority,
  ReviewReason,
  ReviewerDecision,
  ReviewSignalInput,
  ReviewSubjectType
} from "../../types/alphabet/admin-appeal-review.types";
import { reviewAdminCase } from "./admin-review-engine";

type AdminReviewStoreState = {
  cases: Map<string, ReviewCase>;
  results: Map<string, AdminReviewResult>;
};

const store: AdminReviewStoreState = {
  cases: new Map(),
  results: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createReviewCase(params: {
  subjectType: ReviewSubjectType;
  subjectId: string;
  userId?: string | null;
  walletId?: string | null;
  reason: ReviewReason;
  priority: ReviewPriority;
  evidencePacket: ReviewEvidencePacket;
}): ReviewCase {
  const now = nowIso();

  const reviewCase: ReviewCase = {
    reviewCaseId: createId("review_case"),
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    userId: params.userId ?? null,
    walletId: params.walletId ?? null,
    reason: params.reason,
    priority: params.priority,
    assignedReviewerId: null,
    status: "review_open",
    appealStatus: "none",
    evidencePacket: params.evidencePacket,
    createdAt: now,
    assignedAt: null,
    decidedAt: null,
    appealedAt: null,
    closedAt: null,
    updatedAt: now
  };

  store.cases.set(reviewCase.reviewCaseId, reviewCase);

  return reviewCase;
}

export function getReviewCase(reviewCaseId: string): ReviewCase | null {
  return store.cases.get(reviewCaseId) ?? null;
}

export function assignReviewCase(params: {
  reviewCaseId: string;
  reviewerId: string;
}): ReviewCase {
  const reviewCase = getReviewCase(params.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const now = nowIso();

  const next: ReviewCase = {
    ...reviewCase,
    assignedReviewerId: params.reviewerId,
    status: "review_assigned",
    assignedAt: now,
    updatedAt: now
  };

  store.cases.set(next.reviewCaseId, next);

  return next;
}

export function openAppeal(params: {
  reviewCaseId: string;
  userExplanation: string;
}): ReviewCase {
  const reviewCase = getReviewCase(params.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const now = nowIso();

  const next: ReviewCase = {
    ...reviewCase,
    status: "appeal_open",
    appealStatus: "appeal_opened",
    appealedAt: now,
    updatedAt: now,
    evidencePacket: {
      ...reviewCase.evidencePacket,
      userExplanation: params.userExplanation
    }
  };

  store.cases.set(next.reviewCaseId, next);

  return next;
}

export function addReviewerNotes(params: {
  reviewCaseId: string;
  reviewerNotes: string;
}): ReviewCase {
  const reviewCase = getReviewCase(params.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const next: ReviewCase = {
    ...reviewCase,
    evidencePacket: {
      ...reviewCase.evidencePacket,
      reviewerNotes: params.reviewerNotes
    },
    updatedAt: nowIso()
  };

  store.cases.set(next.reviewCaseId, next);

  return next;
}

export function decideStoredReviewCase(
  input: Omit<
    ReviewSignalInput,
    | "reviewCaseId"
    | "subjectType"
    | "subjectId"
    | "userId"
    | "walletId"
    | "reason"
    | "priority"
    | "assignedReviewerId"
    | "appealStatus"
  > & {
    reviewCaseId: string;
    reviewerDecision?: ReviewerDecision | null;
    appealStatus?: AppealStatus;
  }
): AdminReviewResult {
  const reviewCase = getReviewCase(input.reviewCaseId);

  if (!reviewCase) {
    throw new Error("Review case not found.");
  }

  const result = reviewAdminCase({
    ...input,
    reviewCaseId: reviewCase.reviewCaseId,
    subjectType: reviewCase.subjectType,
    subjectId: reviewCase.subjectId,
    userId: reviewCase.userId,
    walletId: reviewCase.walletId,
    reason: reviewCase.reason,
    priority: reviewCase.priority,
    assignedReviewerId: reviewCase.assignedReviewerId,
    appealStatus: input.appealStatus ?? reviewCase.appealStatus,
    metadata: {
      sourceEventIds: reviewCase.evidencePacket.sourceEventIds,
      sourceObjectType: reviewCase.evidencePacket.sourceObjectType ?? null,
      sourceObjectId: reviewCase.evidencePacket.sourceObjectId ?? null,
      userExplanation: reviewCase.evidencePacket.userExplanation ?? null,
      reviewerNotes: reviewCase.evidencePacket.reviewerNotes ?? null,
      ...(reviewCase.evidencePacket.metadata &&
      typeof reviewCase.evidencePacket.metadata === "object" &&
      !Array.isArray(reviewCase.evidencePacket.metadata)
        ? reviewCase.evidencePacket.metadata
        : {}),
      ...(input.metadata &&
      typeof input.metadata === "object" &&
      !Array.isArray(input.metadata)
        ? input.metadata
        : {})
    }
  });

  const now = nowIso();

  const next: ReviewCase = {
    ...reviewCase,
    status: result.status,
    appealStatus: result.appealStatus,
    decidedAt:
      result.status === "review_decided" ||
      result.status === "appeal_decided" ||
      result.status === "suspicious" ||
      result.status === "escalated"
        ? now
        : reviewCase.decidedAt,
    closedAt:
      result.status === "closed" ||
      result.status === "appeal_decided" ||
      result.status === "review_decided"
        ? now
        : reviewCase.closedAt,
    updatedAt: now
  };

  store.cases.set(next.reviewCaseId, next);
  store.results.set(result.reviewCaseId, result);

  return result;
}

export function getAdminReviewResult(reviewCaseId: string): AdminReviewResult | null {
  return store.results.get(reviewCaseId) ?? null;
}

export function resetAdminReviewStoreForTests(): void {
  store.cases.clear();
  store.results.clear();
}
