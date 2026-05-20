import type {
  CampaignBudgetLedgerEntry,
  CampaignBudgetOperationResult,
  CampaignBudgetPool,
  CampaignBudgetReservation,
  CreateCampaignBudgetInput,
  ReserveCampaignRewardInput
} from "../../types/alphabet/campaign-budget.types";
import {
  commitCampaignRewardReservation,
  createCampaignBudgetPool,
  refundAvailableCampaignBudget,
  releaseCampaignRewardReservation,
  reserveCampaignReward,
  spendCommittedCampaignReward
} from "./campaign-budget-engine";

type CampaignBudgetStoreState = {
  pools: Map<string, CampaignBudgetPool>;
  poolsByCampaignId: Map<string, string>;
  reservations: Map<string, CampaignBudgetReservation>;
  ledgerEntries: CampaignBudgetLedgerEntry[];
};

const store: CampaignBudgetStoreState = {
  pools: new Map(),
  poolsByCampaignId: new Map(),
  reservations: new Map(),
  ledgerEntries: []
};

function persistResult(result: CampaignBudgetOperationResult): CampaignBudgetOperationResult {
  if (!result.success) return result;

  if (result.campaignBudget) {
    store.pools.set(result.campaignBudget.campaignBudgetId, result.campaignBudget);
    store.poolsByCampaignId.set(
      result.campaignBudget.campaignId,
      result.campaignBudget.campaignBudgetId
    );
  }

  if (result.reservation) {
    store.reservations.set(result.reservation.reservationId, result.reservation);
  }

  if (result.ledgerEntry) {
    store.ledgerEntries.push(result.ledgerEntry);
  }

  return result;
}

export function createCampaignBudget(
  input: CreateCampaignBudgetInput
): CampaignBudgetOperationResult {
  const existingBudgetId = store.poolsByCampaignId.get(input.campaignId);

  if (existingBudgetId) {
    return {
      success: false,
      reason: "Campaign already has a budget pool.",
      campaignBudget: store.pools.get(existingBudgetId)
    };
  }

  return persistResult(createCampaignBudgetPool(input));
}

export function getCampaignBudgetById(campaignBudgetId: string): CampaignBudgetPool | null {
  return store.pools.get(campaignBudgetId) ?? null;
}

export function getCampaignBudgetByCampaignId(campaignId: string): CampaignBudgetPool | null {
  const id = store.poolsByCampaignId.get(campaignId);
  if (!id) return null;
  return store.pools.get(id) ?? null;
}

export function getCampaignBudgetReservation(
  reservationId: string
): CampaignBudgetReservation | null {
  return store.reservations.get(reservationId) ?? null;
}

export function reserveRewardFromCampaignBudget(
  input: Omit<ReserveCampaignRewardInput, "campaignBudget"> & {
    campaignId: string;
  }
): CampaignBudgetOperationResult {
  const pool = getCampaignBudgetByCampaignId(input.campaignId);

  if (!pool) {
    return {
      success: false,
      reason: "Campaign budget pool not found."
    };
  }

  return persistResult(
    reserveCampaignReward({
      campaignBudget: pool,
      userId: input.userId,
      sourceEventId: input.sourceEventId,
      amount: input.amount,
      reservationTtlMinutes: input.reservationTtlMinutes
    })
  );
}

export function commitReservation(reservationId: string): CampaignBudgetOperationResult {
  const reservation = getCampaignBudgetReservation(reservationId);

  if (!reservation) {
    return {
      success: false,
      reason: "Reservation not found."
    };
  }

  const pool = getCampaignBudgetById(reservation.campaignBudgetId);

  if (!pool) {
    return {
      success: false,
      reason: "Campaign budget pool not found.",
      reservation
    };
  }

  return persistResult(
    commitCampaignRewardReservation({
      campaignBudget: pool,
      reservation
    })
  );
}

export function spendReservation(reservationId: string): CampaignBudgetOperationResult {
  const reservation = getCampaignBudgetReservation(reservationId);

  if (!reservation) {
    return {
      success: false,
      reason: "Reservation not found."
    };
  }

  const pool = getCampaignBudgetById(reservation.campaignBudgetId);

  if (!pool) {
    return {
      success: false,
      reason: "Campaign budget pool not found.",
      reservation
    };
  }

  return persistResult(
    spendCommittedCampaignReward({
      campaignBudget: pool,
      reservation
    })
  );
}

export function releaseReservation(
  reservationId: string,
  reason: string
): CampaignBudgetOperationResult {
  const reservation = getCampaignBudgetReservation(reservationId);

  if (!reservation) {
    return {
      success: false,
      reason: "Reservation not found."
    };
  }

  const pool = getCampaignBudgetById(reservation.campaignBudgetId);

  if (!pool) {
    return {
      success: false,
      reason: "Campaign budget pool not found.",
      reservation
    };
  }

  return persistResult(
    releaseCampaignRewardReservation({
      campaignBudget: pool,
      reservation,
      reason
    })
  );
}

export function refundCampaignBudget(params: {
  campaignId: string;
  amount?: number;
  reason: string;
}): CampaignBudgetOperationResult {
  const pool = getCampaignBudgetByCampaignId(params.campaignId);

  if (!pool) {
    return {
      success: false,
      reason: "Campaign budget pool not found."
    };
  }

  return persistResult(
    refundAvailableCampaignBudget({
      campaignBudget: pool,
      amount: params.amount,
      reason: params.reason
    })
  );
}

export function getCampaignBudgetLedgerEntries(
  campaignBudgetId: string
): CampaignBudgetLedgerEntry[] {
  return store.ledgerEntries.filter((entry) => entry.campaignBudgetId === campaignBudgetId);
}

export function resetCampaignBudgetStoreForTests(): void {
  store.pools.clear();
  store.poolsByCampaignId.clear();
  store.reservations.clear();
  store.ledgerEntries.length = 0;
}
