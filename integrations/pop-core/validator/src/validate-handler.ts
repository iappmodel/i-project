import type { ProofPacketV0 } from "@pop-core/backend";
import {
  ProofReviewService,
  JsonFileProofReviewStore,
  JsonFilePendingHoldStore,
  createPendingHoldFromReview,
  createDefaultPopValueFlowStores,
  runPopValueFlow,
  type PopValueFlowResult
} from "@pop-core/backend";

export const VALIDATOR_VERSION = "POP_VALIDATOR_STUB_V1" as const;

export type ValidateMode = "pending" | "full";

export interface ValidateRequestBody {
  packet: ProofPacketV0;
  mode?: ValidateMode;
  artifactId?: string;
  submittedAt?: string;
}

export interface PendingValidateResponse {
  validatorVersion: typeof VALIDATOR_VERSION;
  mode: "pending";
  sessionId: string;
  reviewStatus: string;
  reviewOutcome: "submitted" | "existing";
  holdOutcome: "created" | "existing" | "skipped";
  hold: {
    amount: number;
    currency: string;
    status: string;
    releaseStatus: string;
  } | null;
  skipReason?: string;
}

export interface FullValidateResponse {
  validatorVersion: typeof VALIDATOR_VERSION;
  mode: "full";
  sessionId: string;
  reviewStatus: string;
  holdAmount: number;
  walletCreditAmount: number;
  availableMinor: number;
  outcomes: PopValueFlowResult["outcomes"];
}

export type ValidateResponse = PendingValidateResponse | FullValidateResponse;

export interface ValidatorStores {
  reviewStore: JsonFileProofReviewStore;
  holdStore: JsonFilePendingHoldStore;
}

export function createValidatorStores(dataDir: string): ValidatorStores {
  return {
    reviewStore: new JsonFileProofReviewStore({
      baseDir: `${dataDir}/proof-reviews`
    }),
    holdStore: new JsonFilePendingHoldStore({
      baseDir: `${dataDir}/pending-holds`
    })
  };
}

export function validateProofPacket(
  body: ValidateRequestBody,
  stores: ValidatorStores
): ValidateResponse {
  const mode: ValidateMode = body.mode ?? "pending";
  const submittedAt = body.submittedAt ?? new Date().toISOString();

  if (mode === "full") {
    const flowStores = createDefaultPopValueFlowStores();
    flowStores.reviewStore = stores.reviewStore;
    flowStores.holdStore = stores.holdStore;

    const result = runPopValueFlow(body.packet, {
      stores: flowStores,
      artifactId: body.artifactId,
      submittedAt
    });

    return {
      validatorVersion: VALIDATOR_VERSION,
      mode: "full",
      sessionId: result.sessionId,
      reviewStatus: result.review.review.status,
      holdAmount: result.hold.amount,
      walletCreditAmount: result.walletCredit.amount,
      availableMinor: result.balance.availableMinor,
      outcomes: result.outcomes
    };
  }

  const reviewService = new ProofReviewService(stores.reviewStore);
  const existing = reviewService.getReviewBySessionId(body.packet.sessionId);
  const reviewRecord =
    existing ??
    reviewService.submitProofPacketForReview(body.packet, {
      artifactId: body.artifactId,
      submittedAt
    });

  const holdResult = createPendingHoldFromReview(reviewRecord, {
    store: stores.holdStore,
    createdAt: submittedAt
  });

  const hold = holdResult.hold;

  return {
    validatorVersion: VALIDATOR_VERSION,
    mode: "pending",
    sessionId: body.packet.sessionId,
    reviewStatus: reviewRecord.status,
    reviewOutcome: existing ? "existing" : "submitted",
    holdOutcome: holdResult.outcome,
    hold: hold
      ? {
          amount: hold.amount,
          currency: hold.currency,
          status: hold.status,
          releaseStatus: hold.releaseStatus
        }
      : null,
    skipReason: holdResult.skipReason
  };
}
