/**
 * Stage 11 — review requests + approval gates (mock rules).
 *
 * Hard rules:
 * 1. Required review not approved blocks publish.
 * 2. Safety failed blocks publish.
 * 3. Brand campaign requires brand approval.
 * 4. Legal if age-restricted sponsored.
 * 5. Finance if budget > threshold.
 * 6. Changes requested blocks until new version.
 * 7. Approval applies to version only — store tracks fingerprint staleness.
 * 8. Project changes after approval invalidate prior approvals (handled in store; gates recalc).
 */

import type { ApprovalGate, StudioReviewRequest, ReviewRequestStatus, ReviewDecision } from './studioCollabTypes';
import type { StudioPersistedSlice } from '../studioDomainTypes';

const FINANCE_BUDGET_THRESHOLD_USD = 5000;

export interface CreateReviewInput {
  id: string;
  projectId: string;
  versionId: string;
  requestedByUserId: string;
  requestedByName: string;
  assignedToUserId: string;
  assignedToName: string;
  type: StudioReviewRequest['type'];
  message?: string;
  requiredForPublish: boolean;
  dueAt?: string;
}

export function createReviewRequest(input: CreateReviewInput): StudioReviewRequest {
  return {
    id: input.id,
    projectId: input.projectId,
    versionId: input.versionId,
    requestedByUserId: input.requestedByUserId,
    requestedByName: input.requestedByName,
    assignedToUserId: input.assignedToUserId,
    assignedToName: input.assignedToName,
    type: input.type,
    status: 'requested',
    message: input.message,
    requiredForPublish: input.requiredForPublish,
    dueAt: input.dueAt,
    createdAt: new Date().toISOString(),
  };
}

function withDecision(
  request: StudioReviewRequest,
  status: ReviewRequestStatus,
  decision: ReviewDecision | undefined,
  decisionMessage: string | undefined,
): StudioReviewRequest {
  return {
    ...request,
    status,
    decision,
    decisionMessage,
    decidedAt: new Date().toISOString(),
  };
}

export function approveReviewRequest(request: StudioReviewRequest, decisionMessage?: string): StudioReviewRequest {
  return withDecision(request, 'approved', 'approved', decisionMessage);
}

export function requestChanges(request: StudioReviewRequest, decisionMessage?: string): StudioReviewRequest {
  return withDecision(request, 'changes_requested', 'changes_requested', decisionMessage);
}

export function rejectReviewRequest(request: StudioReviewRequest, decisionMessage?: string): StudioReviewRequest {
  return withDecision(request, 'rejected', 'rejected', decisionMessage);
}

export function cancelReviewRequest(request: StudioReviewRequest): StudioReviewRequest {
  return { ...request, status: 'cancelled', decidedAt: new Date().toISOString() };
}

export interface PublishChecks {
  mediaReady: boolean;
  rightsCleared: boolean;
  campaignBudgetOk: boolean;
}

export function calculateApprovalGates(
  projectSlice: StudioPersistedSlice,
  reviews: StudioReviewRequest[],
  publishChecks: PublishChecks,
  nowIso: string,
): ApprovalGate[] {
  const projectId = projectSlice.project.id;
  const gates: ApprovalGate[] = [];

  const mk = (
    id: string,
    label: string,
    type: ApprovalGate['type'],
    required: boolean,
    status: ApprovalGate['status'],
    blocking: boolean,
    reason?: string,
    relatedReviewRequestId?: string,
  ): ApprovalGate => ({
    id,
    projectId,
    label,
    type,
    required,
    status,
    relatedReviewRequestId,
    blocking,
    reason,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  gates.push(
    mk(
      `${projectId}_gate_media`,
      'Media ready',
      'media_ready',
      true,
      publishChecks.mediaReady ? 'passed' : 'pending',
      !publishChecks.mediaReady,
      publishChecks.mediaReady ? undefined : 'Media processing incomplete.',
    ),
  );

  const safety = reviews.find((r) => r.type === 'safety_review');
  let safetyStatus: ApprovalGate['status'] = 'pending';
  let safetyReason: string | undefined;
  if (safety?.status === 'approved') safetyStatus = 'passed';
  else if (safety?.status === 'rejected') {
    safetyStatus = 'failed';
    safetyReason = 'Safety review rejected.';
  } else if (safety?.status === 'changes_requested') {
    safetyStatus = 'failed';
    safetyReason = 'Safety requested changes.';
  }
  gates.push(
    mk(
      `${projectId}_gate_safety`,
      'Safety review',
      'safety_review',
      true,
      safetyStatus,
      safetyStatus !== 'passed',
      safetyReason,
      safety?.id,
    ),
  );

  const brand = reviews.find((r) => r.type === 'brand_approval');
  let brandStatus: ApprovalGate['status'] = 'pending';
  let brandReason: string | undefined;
  if (projectSlice.campaign.requiresBrandApproval) {
    if (brand?.status === 'approved') brandStatus = 'passed';
    else if (brand?.status === 'rejected') {
      brandStatus = 'failed';
      brandReason = 'Brand rejected.';
    } else if (brand?.status === 'changes_requested') {
      brandStatus = 'failed';
      brandReason = 'Brand requested changes.';
    }
  } else {
    brandStatus = 'waived';
  }
  gates.push(
    mk(
      `${projectId}_gate_brand`,
      'Brand approval',
      'brand_approval',
      projectSlice.campaign.requiresBrandApproval,
      brandStatus,
      projectSlice.campaign.requiresBrandApproval && brandStatus !== 'passed' && brandStatus !== 'waived',
      brandReason,
      brand?.id,
    ),
  );

  gates.push(
    mk(
      `${projectId}_gate_rights`,
      'Rights cleared',
      'rights_cleared',
      true,
      publishChecks.rightsCleared ? 'passed' : 'pending',
      !publishChecks.rightsCleared,
      publishChecks.rightsCleared ? undefined : 'Rights report pending.',
    ),
  );

  const financeNeeded = projectSlice.campaign.budgetUsd > FINANCE_BUDGET_THRESHOLD_USD;
  const finance = reviews.find((r) => r.type === 'finance_review');
  let finStatus: ApprovalGate['status'] = financeNeeded ? 'pending' : 'waived';
  let finReason: string | undefined;
  if (financeNeeded) {
    if (finance?.status === 'approved') finStatus = 'passed';
    else if (finance?.status === 'rejected') {
      finStatus = 'failed';
      finReason = 'Finance rejected budget.';
    } else if (finance?.status === 'changes_requested') {
      finStatus = 'failed';
      finReason = 'Finance requested changes.';
    }
  }
  gates.push(
    mk(
      `${projectId}_gate_finance`,
      'Campaign budget / finance',
      'campaign_budget',
      financeNeeded,
      finStatus,
      financeNeeded && finStatus !== 'passed' && finStatus !== 'waived',
      finReason,
      finance?.id,
    ),
  );

  const legalNeeded = projectSlice.disclosures.sponsored && projectSlice.disclosures.ageRestricted;
  const legal = reviews.find((r) => r.type === 'legal_review');
  let legalStatus: ApprovalGate['status'] = legalNeeded ? 'pending' : 'waived';
  let legalReason: string | undefined;
  if (legalNeeded) {
    if (legal?.status === 'approved') legalStatus = 'passed';
    else if (legal?.status === 'rejected') {
      legalStatus = 'failed';
      legalReason = 'Legal rejected.';
    } else if (legal?.status === 'changes_requested') {
      legalStatus = 'failed';
      legalReason = 'Legal requested changes.';
    }
  }
  gates.push(
    mk(
      `${projectId}_gate_legal`,
      'Legal (age-restricted sponsored)',
      'legal_review',
      legalNeeded,
      legalStatus,
      legalNeeded && legalStatus !== 'passed' && legalStatus !== 'waived',
      legalReason,
      legal?.id,
    ),
  );

  const final = reviews.find((r) => r.type === 'final_publish_approval');
  let finalStatus: ApprovalGate['status'] = 'pending';
  if (final?.status === 'approved') finalStatus = 'passed';
  else if (final?.status === 'rejected') finalStatus = 'failed';
  else if (final?.status === 'changes_requested') finalStatus = 'failed';
  gates.push(
    mk(
      `${projectId}_gate_final`,
      'Final publish approval',
      'final_publish_approval',
      true,
      finalStatus,
      finalStatus !== 'passed',
      finalStatus === 'failed' ? 'Final publish not approved.' : undefined,
      final?.id,
    ),
  );

  const anyChanges = reviews.some((r) => r.requiredForPublish && r.status === 'changes_requested');
  if (anyChanges) {
    gates.forEach((g, i) => {
      if (g.status === 'pending') {
        gates[i] = {
          ...g,
          status: 'failed',
          blocking: true,
          reason: 'Changes requested on a required review — submit new version.',
          updatedAt: nowIso,
        };
      }
    });
  }

  return gates;
}

export { FINANCE_BUDGET_THRESHOLD_USD };
