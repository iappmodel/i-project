import type {
  CampaignBudgetLedgerEntry,
  CampaignBudgetOperationResult,
  CampaignBudgetPool,
  CampaignBudgetReservation,
  CreateCampaignBudgetInput,
  ReserveCampaignRewardInput
} from "../../types/alphabet/campaign-budget.types";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutes(date: Date, minutes: number): string {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next.toISOString();
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function snapshot(pool: CampaignBudgetPool) {
  return {
    availableBudget: pool.availableBudget,
    reservedBudget: pool.reservedBudget,
    committedBudget: pool.committedBudget,
    spentBudget: pool.spentBudget,
    refundedBudget: pool.refundedBudget
  };
}

function createBudgetLedgerEntry(params: {
  poolBefore: CampaignBudgetPool;
  poolAfter: CampaignBudgetPool;
  direction: CampaignBudgetLedgerEntry["direction"];
  amount: number;
  reservationId?: string | null;
  sourceEventId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}): CampaignBudgetLedgerEntry {
  return {
    entryId: createId("campaign_budget_ledger"),
    campaignBudgetId: params.poolAfter.campaignBudgetId,
    campaignId: params.poolAfter.campaignId,
    direction: params.direction,
    rewardCoin: params.poolAfter.rewardCoin,
    amount: round(params.amount),
    reservationId: params.reservationId ?? null,
    sourceEventId: params.sourceEventId ?? null,
    userId: params.userId ?? null,
    before: snapshot(params.poolBefore),
    after: snapshot(params.poolAfter),
    metadata: params.metadata ?? {},
    createdAt: nowIso()
  };
}

function assertPoolInvariant(pool: CampaignBudgetPool): void {
  const values = [
    pool.totalBudget,
    pool.availableBudget,
    pool.reservedBudget,
    pool.committedBudget,
    pool.spentBudget,
    pool.refundedBudget
  ];

  if (values.some((value) => value < -0.000001)) {
    throw new Error("Campaign budget invariant failed: negative budget value.");
  }

  const accounted = round(
    pool.availableBudget +
      pool.reservedBudget +
      pool.committedBudget +
      pool.spentBudget +
      pool.refundedBudget
  );

  if (accounted - pool.totalBudget > 0.000001) {
    throw new Error("Campaign budget invariant failed: accounted budget exceeds total budget.");
  }
}

export function createCampaignBudgetPool(
  input: CreateCampaignBudgetInput
): CampaignBudgetOperationResult {
  if (input.totalBudget <= 0) {
    return {
      success: false,
      reason: "Total budget must be greater than zero."
    };
  }

  const now = nowIso();

  const pool: CampaignBudgetPool = {
    campaignBudgetId: createId("campaign_budget"),
    campaignId: input.campaignId,
    ownerId: input.ownerId,
    rewardCoin: input.rewardCoin,
    totalBudget: round(input.totalBudget),
    availableBudget: round(input.totalBudget),
    reservedBudget: 0,
    committedBudget: 0,
    spentBudget: 0,
    refundedBudget: 0,
    status: "funded",
    createdAt: now,
    updatedAt: now
  };

  const before: CampaignBudgetPool = {
    ...pool,
    availableBudget: 0,
    totalBudget: round(input.totalBudget)
  };

  const ledgerEntry = createBudgetLedgerEntry({
    poolBefore: before,
    poolAfter: pool,
    direction: "fund",
    amount: input.totalBudget,
    metadata: {
      ownerId: input.ownerId
    }
  });

  assertPoolInvariant(pool);

  return {
    success: true,
    campaignBudget: pool,
    ledgerEntry
  };
}

export function reserveCampaignReward(
  input: ReserveCampaignRewardInput
): CampaignBudgetOperationResult {
  const pool = input.campaignBudget;

  if (pool.status !== "funded" && pool.status !== "active") {
    return {
      success: false,
      reason: `Campaign budget is not reservable in status: ${pool.status}.`,
      campaignBudget: pool
    };
  }

  if (input.amount <= 0) {
    return {
      success: false,
      reason: "Reservation amount must be greater than zero.",
      campaignBudget: pool
    };
  }

  if (pool.availableBudget < input.amount) {
    return {
      success: false,
      reason: "Insufficient campaign available budget.",
      campaignBudget: pool
    };
  }

  const before = { ...pool };

  const after: CampaignBudgetPool = {
    ...pool,
    availableBudget: round(pool.availableBudget - input.amount),
    reservedBudget: round(pool.reservedBudget + input.amount),
    status: pool.status === "funded" ? "active" : pool.status,
    updatedAt: nowIso()
  };

  assertPoolInvariant(after);

  const now = nowIso();
  const reservation: CampaignBudgetReservation = {
    reservationId: createId("campaign_reservation"),
    campaignBudgetId: after.campaignBudgetId,
    campaignId: after.campaignId,
    userId: input.userId,
    sourceEventId: input.sourceEventId,
    rewardCoin: after.rewardCoin,
    amount: round(input.amount),
    status: "reserved",
    expiresAt: addMinutes(new Date(), input.reservationTtlMinutes ?? 30),
    createdAt: now,
    updatedAt: now
  };

  const ledgerEntry = createBudgetLedgerEntry({
    poolBefore: before,
    poolAfter: after,
    direction: "reserve",
    amount: input.amount,
    reservationId: reservation.reservationId,
    sourceEventId: input.sourceEventId,
    userId: input.userId
  });

  return {
    success: true,
    campaignBudget: after,
    reservation,
    ledgerEntry
  };
}

export function commitCampaignRewardReservation(params: {
  campaignBudget: CampaignBudgetPool;
  reservation: CampaignBudgetReservation;
}): CampaignBudgetOperationResult {
  const { campaignBudget: pool, reservation } = params;

  if (reservation.status !== "reserved") {
    return {
      success: false,
      reason: `Reservation is not reserved. Current status: ${reservation.status}.`,
      campaignBudget: pool,
      reservation
    };
  }

  if (pool.reservedBudget < reservation.amount) {
    return {
      success: false,
      reason: "Reserved budget is lower than reservation amount.",
      campaignBudget: pool,
      reservation
    };
  }

  const before = { ...pool };

  const after: CampaignBudgetPool = {
    ...pool,
    reservedBudget: round(pool.reservedBudget - reservation.amount),
    committedBudget: round(pool.committedBudget + reservation.amount),
    updatedAt: nowIso()
  };

  assertPoolInvariant(after);

  const updatedReservation: CampaignBudgetReservation = {
    ...reservation,
    status: "committed",
    updatedAt: nowIso()
  };

  const ledgerEntry = createBudgetLedgerEntry({
    poolBefore: before,
    poolAfter: after,
    direction: "commit",
    amount: reservation.amount,
    reservationId: reservation.reservationId,
    sourceEventId: reservation.sourceEventId,
    userId: reservation.userId
  });

  return {
    success: true,
    campaignBudget: after,
    reservation: updatedReservation,
    ledgerEntry
  };
}

export function spendCommittedCampaignReward(params: {
  campaignBudget: CampaignBudgetPool;
  reservation: CampaignBudgetReservation;
}): CampaignBudgetOperationResult {
  const { campaignBudget: pool, reservation } = params;

  if (reservation.status !== "committed") {
    return {
      success: false,
      reason: `Reservation is not committed. Current status: ${reservation.status}.`,
      campaignBudget: pool,
      reservation
    };
  }

  if (pool.committedBudget < reservation.amount) {
    return {
      success: false,
      reason: "Committed budget is lower than reservation amount.",
      campaignBudget: pool,
      reservation
    };
  }

  const before = { ...pool };
  const nextCommittedBudget = round(pool.committedBudget - reservation.amount);
  const after: CampaignBudgetPool = {
    ...pool,
    committedBudget: nextCommittedBudget,
    spentBudget: round(pool.spentBudget + reservation.amount),
    status:
      round(pool.availableBudget + pool.reservedBudget + nextCommittedBudget) <= 0
        ? "exhausted"
        : pool.status,
    updatedAt: nowIso()
  };

  assertPoolInvariant(after);

  const updatedReservation: CampaignBudgetReservation = {
    ...reservation,
    status: "spent",
    updatedAt: nowIso()
  };

  const ledgerEntry = createBudgetLedgerEntry({
    poolBefore: before,
    poolAfter: after,
    direction: "spend",
    amount: reservation.amount,
    reservationId: reservation.reservationId,
    sourceEventId: reservation.sourceEventId,
    userId: reservation.userId
  });

  return {
    success: true,
    campaignBudget: after,
    reservation: updatedReservation,
    ledgerEntry
  };
}

export function releaseCampaignRewardReservation(params: {
  campaignBudget: CampaignBudgetPool;
  reservation: CampaignBudgetReservation;
  reason: string;
}): CampaignBudgetOperationResult {
  const { campaignBudget: pool, reservation } = params;

  if (reservation.status !== "reserved") {
    return {
      success: false,
      reason: `Only reserved reservations can be released. Current status: ${reservation.status}.`,
      campaignBudget: pool,
      reservation
    };
  }

  if (pool.reservedBudget < reservation.amount) {
    return {
      success: false,
      reason: "Reserved budget is lower than reservation amount.",
      campaignBudget: pool,
      reservation
    };
  }

  const before = { ...pool };

  const after: CampaignBudgetPool = {
    ...pool,
    availableBudget: round(pool.availableBudget + reservation.amount),
    reservedBudget: round(pool.reservedBudget - reservation.amount),
    updatedAt: nowIso()
  };

  assertPoolInvariant(after);

  const updatedReservation: CampaignBudgetReservation = {
    ...reservation,
    status: "released",
    updatedAt: nowIso()
  };

  const ledgerEntry = createBudgetLedgerEntry({
    poolBefore: before,
    poolAfter: after,
    direction: "release",
    amount: reservation.amount,
    reservationId: reservation.reservationId,
    sourceEventId: reservation.sourceEventId,
    userId: reservation.userId,
    metadata: {
      reason: params.reason
    }
  });

  return {
    success: true,
    campaignBudget: after,
    reservation: updatedReservation,
    ledgerEntry
  };
}

export function refundAvailableCampaignBudget(params: {
  campaignBudget: CampaignBudgetPool;
  amount?: number;
  reason: string;
}): CampaignBudgetOperationResult {
  const pool = params.campaignBudget;
  const amount = params.amount ?? pool.availableBudget;

  if (amount <= 0) {
    return {
      success: false,
      reason: "Refund amount must be greater than zero.",
      campaignBudget: pool
    };
  }

  if (amount > pool.availableBudget) {
    return {
      success: false,
      reason: "Refund amount exceeds available budget.",
      campaignBudget: pool
    };
  }

  const before = { ...pool };

  const nextAvailableBudget = round(pool.availableBudget - amount);
  const after: CampaignBudgetPool = {
    ...pool,
    availableBudget: nextAvailableBudget,
    refundedBudget: round(pool.refundedBudget + amount),
    status:
      nextAvailableBudget <= 0 && pool.reservedBudget <= 0 && pool.committedBudget <= 0
        ? "refunded"
        : "refunding",
    updatedAt: nowIso()
  };

  assertPoolInvariant(after);

  const ledgerEntry = createBudgetLedgerEntry({
    poolBefore: before,
    poolAfter: after,
    direction: "refund",
    amount,
    metadata: {
      reason: params.reason
    }
  });

  return {
    success: true,
    campaignBudget: after,
    ledgerEntry
  };
}
