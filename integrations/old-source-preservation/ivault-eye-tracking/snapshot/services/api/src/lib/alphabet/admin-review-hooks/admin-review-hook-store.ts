import { getAdminReviewHookRule } from "@/data/alphabet/admin-review-hook-rules";
import type { AlphabetEvent } from "@/types/alphabet/event.types";
import type {
  AdminReviewHookEvaluationResult,
  AdminReviewHookInput,
  AdminReviewHookStoreResult
} from "@/types/alphabet/admin-review-hooks.types";
import { createAdminReviewCase } from "../admin-review/admin-review-store";
import { insertAlphabetEvent } from "../db-repositories/alphabet-events.repository";
import {
  countOpenAdminReviewCasesByDedupeKeyDb,
  getAdminReviewCaseByIdempotencyKeyDb
} from "../db-repositories/admin-review.repository";
import {
  buildAdminReviewHookAlphabetEvent,
  buildDedupeKeyFromInput,
  evaluateAdminReviewHook
} from "./admin-review-hook-engine";
import { adminReviewHookFail } from "./admin-review-hook-errors";
import { buildReviewCaseParamsFromHook } from "./review-case-factory";

async function persistHookAlphabetEvent(event: AlphabetEvent): Promise<string> {
  const userId =
    !event.userId || event.userId === "system" || event.userId === "00000000-0000-0000-0000-000000000001"
      ? null
      : event.userId;

  const saved = await insertAlphabetEvent({
    userId,
    coinCode: event.coinCode ?? null,
    eventType: event.eventType,
    objectType: event.objectType ?? null,
    objectId: event.objectId ?? null,
    sourceContext: event.sourceContext,
    rawScore: event.rawScore ?? null,
    qualityScore: event.qualityScore ?? null,
    trustScoreAtEvent: event.trustScoreAtEvent ?? null,
    riskScore: event.riskScore ?? null,
    ageBand: event.ageBand ?? null,
    verificationStatus: event.verificationStatus,
    metadata: (event.metadata ?? {}) as never
  });

  return saved.event_id;
}

async function persistHookAlphabetEvents(events: Array<AlphabetEvent | null | undefined>): Promise<string[]> {
  const ids: string[] = [];
  for (const event of events) {
    if (!event) continue;
    ids.push(await persistHookAlphabetEvent(event));
  }
  return ids;
}

function mergeEvaluationForIdempotentReplay(
  base: AdminReviewHookEvaluationResult
): AdminReviewHookEvaluationResult {
  const duplicateEvent =
    base.adminReviewHookDuplicateSkippedEvent ??
    buildAdminReviewHookAlphabetEvent({
      input: {
        hookSource: base.hookSource,
        hookTrigger: base.hookTrigger,
        subjectIds: {},
        sourceObjectType: "idempotency",
        sourceObjectId: base.idempotencyKey,
        rawEvidence: {},
        sourceEventIds: [],
        riskScore: base.hookRiskScore,
        uncertaintyScore: base.reviewNecessityScore,
        userImpactScore: 0,
        platformImpactScore: 0,
        moneyMovementPossible: false,
        paymentUncertainty: false,
        fraudSuspected: false,
        userVisible: false,
        existingOpenReviewCaseCount: 0,
        now: new Date().toISOString()
      } as AdminReviewHookInput,
      eventType: "admin_review_hook_duplicate_skipped",
      rawScore: base.reviewNecessityScore,
      qualityScore: base.hookRiskScore,
      riskScore: base.hookRiskScore,
      verificationStatus: "verified",
      metadata: { reasons: [...base.reasons, "review_case_idempotent_replay"] }
    });

  return {
    ...base,
    status: "review_hook_skip_duplicate",
    shouldCreateCase: false,
    skipDuplicate: true,
    blocked: false,
    failed: false,
    reasons: [...base.reasons, "review_case_idempotent_replay"],
    adminReviewHookDuplicateSkippedEvent: duplicateEvent
  };
}

export async function maybeCreateAdminReviewCaseFromHook(
  input: AdminReviewHookInput
): Promise<AdminReviewHookStoreResult> {
  const dedupeKey = buildDedupeKeyFromInput(input);
  const openCount = await countOpenAdminReviewCasesByDedupeKeyDb(dedupeKey);
  const mergedCount = Math.max(input.existingOpenReviewCaseCount ?? 0, openCount);
  const enriched: AdminReviewHookInput = {
    ...input,
    existingOpenReviewCaseCount: mergedCount
  };

  let evaluation = evaluateAdminReviewHook(enriched);

  const initialEventIds = await persistHookAlphabetEvents([
    evaluation.adminReviewHookDetectedEvent,
    evaluation.adminReviewHookDuplicateSkippedEvent,
    evaluation.adminReviewHookBlockedEvent,
    evaluation.adminReviewHookFailedEvent
  ]);

  if (evaluation.skipDuplicate || evaluation.blocked || evaluation.failed) {
    return {
      ok: !evaluation.failed && !evaluation.blocked,
      evaluation,
      reviewCase: null,
      eventIds: initialEventIds,
      reasonCodes: evaluation.reasons
    };
  }

  if (!evaluation.shouldCreateCase) {
    return {
      ok: true,
      evaluation,
      reviewCase: null,
      eventIds: initialEventIds,
      reasonCodes: evaluation.reasons
    };
  }

  const existingByIdempotency = await getAdminReviewCaseByIdempotencyKeyDb(evaluation.idempotencyKey);
  if (existingByIdempotency) {
    evaluation = mergeEvaluationForIdempotentReplay(evaluation);
    const replayIds = await persistHookAlphabetEvents([evaluation.adminReviewHookDuplicateSkippedEvent]);
    return {
      ok: true,
      evaluation,
      reviewCase: existingByIdempotency,
      eventIds: [...initialEventIds, ...replayIds],
      reasonCodes: evaluation.reasons
    };
  }

  const rule = getAdminReviewHookRule(input.hookTrigger);

  try {
    const caseParams = buildReviewCaseParamsFromHook({
      input: enriched,
      evaluation
    });

    const created = await createAdminReviewCase(caseParams);

    if (created.deduped) {
      evaluation = mergeEvaluationForIdempotentReplay(evaluation);
      const replayIds = await persistHookAlphabetEvents([evaluation.adminReviewHookDuplicateSkippedEvent]);
      return {
        ok: true,
        evaluation,
        reviewCase: created.case,
        eventIds: [...initialEventIds, ...replayIds, ...created.eventIds],
        reasonCodes: evaluation.reasons
      };
    }

    const caseCreatedIds = await persistHookAlphabetEvents([evaluation.adminReviewHookCaseCreatedEvent]);

    return {
      ok: true,
      evaluation,
      reviewCase: created.case,
      eventIds: [...initialEventIds, ...caseCreatedIds, ...created.eventIds],
      reasonCodes: evaluation.reasons
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "review_case_creation_failed";
    const failedEvaluation: AdminReviewHookEvaluationResult = {
      ...evaluation,
      status: "review_hook_failed",
      shouldCreateCase: false,
      skipDuplicate: false,
      blocked: false,
      failed: true,
      reasons: [...evaluation.reasons, message],
      adminReviewHookFailedEvent:
        evaluation.adminReviewHookFailedEvent ??
        buildAdminReviewHookAlphabetEvent({
          input: enriched,
          eventType: "admin_review_hook_failed",
          rawScore: evaluation.reviewNecessityScore,
          qualityScore: evaluation.hookRiskScore,
          riskScore: evaluation.hookRiskScore,
          verificationStatus: "rejected",
          metadata: { error: message, priorStatus: evaluation.status }
        })
    };

    const failedEventIds = await persistHookAlphabetEvents([failedEvaluation.adminReviewHookFailedEvent]);

    if (rule?.failClosed && rule.blocksDownstreamIfCreationFails) {
      adminReviewHookFail({
        code: "admin_review_hook_case_creation_failed",
        message,
        failClosed: true,
        reasonCodes: failedEvaluation.reasons
      });
    }

    return {
      ok: false,
      evaluation: failedEvaluation,
      reviewCase: null,
      eventIds: [...initialEventIds, ...failedEventIds],
      reasonCodes: failedEvaluation.reasons
    };
  }
}
