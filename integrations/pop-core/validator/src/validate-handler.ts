import type { ProofPacketV0, PendingHoldRecord } from "@pop-core/backend";
import {
  ProofReviewService,
  JsonFileProofReviewStore,
  JsonFilePendingHoldStore,
  InMemoryPendingHoldStore,
  createPendingHoldFromReview,
  createAppealHoldFromReview,
  createDefaultPopValueFlowStores,
  runPopValueFlow,
  resolveTrustTier,
  type PopValueFlowResult,
  type PopTrustTier,
  type PendingHoldStore
} from "@pop-core/backend";

import type { SupabaseSettlementClient } from "./supabase-settlement-client.js";
import { mapPopCurrencyToLedger } from "./supabase-settlement.js";
import {
  settleHoldViaSupabase,
  type SettlementSyncResult
} from "./settle-handler.js";
import { persistPendingHold } from "./pending-hold-persist.js";
import {
  readSettlementStoreMode,
  useInMemoryHoldStore,
  type SettlementStoreMode
} from "./settlement-store-mode.js";
import {
  readServerSettlementPolicy,
  computeReleaseEligibleAt,
  computeAppealExpiresAt,
  canServerAutoSettleNow
} from "./settlement-policy.js";
import { syncPopsSessionToSupabase, type PopsSessionSyncResult } from "./pops-session-sync.js";

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
  appealHold?: boolean;
  releaseEligibleAt?: string | null;
  trustTierAtHold?: PopTrustTier;
  popsSession?: PopsSessionSyncResult;
  autoSettle?: { attempted: boolean; code?: string };
  settlementStore?: SettlementStoreMode;
  supabase?: SettlementSyncResult & { storeMode?: SettlementStoreMode };
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
  holdStore: PendingHoldStore;
}

export interface ValidateOptions {
  stores: ValidatorStores;
  supabase?: SupabaseSettlementClient;
}

export function createValidatorStores(
  dataDir: string,
  settlementMode?: SettlementStoreMode
): ValidatorStores {
  const holdStore = useInMemoryHoldStore(settlementMode ?? "local-json")
    ? new InMemoryPendingHoldStore()
    : new JsonFilePendingHoldStore({
        baseDir: `${dataDir}/pending-holds`
      });

  return {
    reviewStore: new JsonFileProofReviewStore({
      baseDir: `${dataDir}/proof-reviews`
    }),
    holdStore
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
  const settlementStore = supabase
    ? readSettlementStoreMode(supabase)
    : ("local-json" as SettlementStoreMode);
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
      ? await persistPendingHold(result.hold, supabase, settlementStore)
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

  const policy = readServerSettlementPolicy();
  const reviewService = new ProofReviewService(stores.reviewStore);
  const existing = reviewService.getReviewBySessionId(body.packet.sessionId);
  const reviewRecord =
    existing ??
    reviewService.submitProofPacketForReview(body.packet, {
      artifactId: body.artifactId,
      submittedAt
    });

  const trustTierAtHold = resolveTrustTier({
    localUserRef: body.packet.localUserRef
  });

  const releaseEligibleAt = computeReleaseEligibleAt(
    submittedAt,
    reviewRecord.status,
    policy,
    trustTierAtHold
  );

  let holdResult = createPendingHoldFromReview(reviewRecord, {
    store: stores.holdStore,
    createdAt: submittedAt,
    releaseEligibleAt,
    trustTierAtHold
  });

  let appealHold = false;
  if (
    holdResult.outcome === "skipped" &&
    holdResult.skipReason === "review_not_settlement_eligible"
  ) {
    const appealExpiresAt = computeAppealExpiresAt(submittedAt, policy);
    holdResult = createAppealHoldFromReview(reviewRecord, {
      store: stores.holdStore,
      createdAt: submittedAt,
      appealExpiresAt
    });
    appealHold = holdResult.outcome === "created" || holdResult.outcome === "existing";

    if (supabase?.isEnabled && holdResult.outcome === "created") {
      try {
        await supabase.recordFraudEvent({
          session_id: reviewRecord.sessionId,
          user_id: reviewRecord.userId ?? null,
          local_user_ref: reviewRecord.localUserRef,
          review_status: reviewRecord.status,
          action_taken: "appeal_hold_created",
          created_at: submittedAt
        });
      } catch {
        // Non-fatal: appeal hold still persisted locally / via hold sync.
      }
    }
  }

  const hold = holdResult.hold;
  const popsSession = supabase
    ? await syncPopsSessionToSupabase(body.packet, reviewRecord, supabase)
    : undefined;

  const supabaseSync = supabase
    ? await persistPendingHold(hold, supabase, settlementStore)
    : undefined;

  let autoSettle: PendingValidateResponse["autoSettle"];
  if (
    policy.serverAutoSettle &&
    supabase?.isEnabled &&
    hold &&
    hold.status === "pending" &&
    reviewRecord.userId &&
    canServerAutoSettleNow(reviewRecord.status, releaseEligibleAt, Date.now(), trustTierAtHold)
  ) {
    try {
      const settlement = await settleHoldViaSupabase(
        hold.sessionId,
        reviewRecord.userId,
        supabase
      );
      autoSettle = {
        attempted: true,
        code: String(settlement.settlement.code ?? "settled")
      };
    } catch (error) {
      autoSettle = {
        attempted: true,
        code: error instanceof Error ? error.message : "auto_settle_failed"
      };
    }
  }

  return {
    validatorVersion: VALIDATOR_VERSION,
    mode: "pending",
    sessionId: body.packet.sessionId,
    reviewStatus: reviewRecord.status,
    reviewOutcome: existing ? "existing" : "submitted",
    holdOutcome: holdResult.outcome,
    hold: hold ? summarizeHold(hold) : null,
    skipReason: holdResult.skipReason,
    appealHold,
    releaseEligibleAt,
    trustTierAtHold,
    popsSession,
    autoSettle,
    settlementStore,
    supabase: supabaseSync
  };
}
