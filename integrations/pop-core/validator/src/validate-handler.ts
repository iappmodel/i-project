import type { ProofPacketV0, PendingHoldRecord } from "@pop-core/backend";
import {
  ProofReviewService,
  JsonFileProofReviewStore,
  JsonFilePendingHoldStore,
  createPendingHoldFromReview,
  createDefaultPopValueFlowStores,
  runPopValueFlow,
  type PopValueFlowResult
} from "@pop-core/backend";

import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";
import { mapPopCurrencyToLedger } from "./supabase-settlement.js";
import { syncPendingHoldToSupabase, type SettlementSyncResult } from "./settle-handler.js";

export const VALIDATOR_VERSION = "POP_VALIDATOR_STUB_V1" as const;

export type ValidateMode = "pending" | "full";

export interface ValidateRequestBody {
  packet: ProofPacketV0;
  mode?: ValidateMode;
  artifactId?: string;
  submittedAt?: string;
}

export interface PendingHoldSummary {
  amount: number;
  currency: string;
  status: string;
  releaseStatus: string;
}

export interface PendingValidateResponse {
  validatorVersion: typeof VALIDATOR_VERSION;
  mode: "pending";
  sessionId: string;
  reviewStatus: string;
  reviewOutcome: "submitted" | "existing";
  holdOutcome: "created" | "existing" | "skipped";
  hold: PendingHoldSummary | null;
  skipReason?: string;
  supabase?: SettlementSyncResult;
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
  supabase?: SettlementSyncResult;
}

export type ValidateResponse = PendingValidateResponse | FullValidateResponse;

export interface ValidatorStores {
  reviewStore: JsonFileProofReviewStore;
  holdStore: JsonFilePendingHoldStore;
}

export interface ValidateOptions {
  stores: ValidatorStores;
  supabase?: SupabaseSettlementClient;
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

function summarizeHold(hold: PendingHoldRecord): PendingHoldSummary {
  return {
    amount: hold.amount ?? 0,
    currency: mapPopCurrencyToLedger(hold.amountBreakdown?.currency),
    status: hold.status,
    releaseStatus: hold.releaseStatus
  };
}

export async function validateProofPacket(
  body: ValidateRequestBody,
  options: ValidateOptions
): Promise<ValidateResponse> {
  const { stores, supabase } = options;
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

    const supabaseSync = supabase
      ? await syncPendingHoldToSupabase(result.hold, supabase)
      : undefined;

    return {
      validatorVersion: VALIDATOR_VERSION,
      mode: "full",
      sessionId: result.sessionId,
      reviewStatus: result.review.review.status,
      holdAmount: result.hold.amount ?? 0,
      walletCreditAmount: result.walletCredit.amount,
      availableMinor: result.balance.availableMinor,
      outcomes: result.outcomes,
      supabase: supabaseSync
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
  const supabaseSync = supabase
    ? await syncPendingHoldToSupabase(hold, supabase)
    : undefined;

  return {
    validatorVersion: VALIDATOR_VERSION,
    mode: "pending",
    sessionId: body.packet.sessionId,
    reviewStatus: reviewRecord.status,
    reviewOutcome: existing ? "existing" : "submitted",
    holdOutcome: holdResult.outcome,
    hold: hold ? summarizeHold(hold) : null,
    skipReason: holdResult.skipReason,
    supabase: supabaseSync
  };
}
