import type {
  CoinBalanceState,
  ConversionQuote,
  ConversionSignalInput,
  ConversionVerificationResult
} from "../../types/alphabet/conversion.types";
import type { CoinCode } from "../../types/alphabet/coin.types";
import { verifyConversionQuote } from "./conversion-engine";

type LiquidityReserve = {
  liquidityReserveId: string;
  conversionQuoteId: string;
  walletId: string;
  userId: string;
  coinCode: CoinCode;
  amount: number;
  status: "reserved" | "released" | "consumed";
  createdAt: string;
  updatedAt: string;
};

type ConversionStoreState = {
  quotes: Map<string, ConversionQuote>;
  verificationResults: Map<string, ConversionVerificationResult>;
  reserves: Map<string, LiquidityReserve>;
};

const store: ConversionStoreState = {
  quotes: new Map(),
  verificationResults: new Map(),
  reserves: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function addHours(date: Date, hours: number): string {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next.toISOString();
}

function calculateTargetAmount(params: {
  sourceAmount: number;
  conversionRate: number;
  conversionFeeRate: number;
}): number {
  const gross = params.sourceAmount * params.conversionRate;
  const fee = gross * params.conversionFeeRate;
  return Number(Math.max(0, gross - fee).toFixed(6));
}

function calculateFeeAmount(params: {
  sourceAmount: number;
  conversionRate: number;
  conversionFeeRate: number;
}): number {
  return Number(
    (params.sourceAmount * params.conversionRate * params.conversionFeeRate).toFixed(6)
  );
}

export function createConversionQuote(params: {
  walletId: string;
  userId: string;
  sourceCoin: CoinCode;
  targetCoin: CoinCode;
  sourceAmount: number;
  conversionRate: number;
  conversionFeeRate: number;
  sourceState: CoinBalanceState;
  expiresInHours?: number;
}): ConversionQuote {
  if (params.sourceAmount <= 0) {
    throw new Error("sourceAmount must be greater than zero.");
  }

  if (params.conversionRate < 0) {
    throw new Error("conversionRate cannot be negative.");
  }

  if (params.conversionFeeRate < 0) {
    throw new Error("conversionFeeRate cannot be negative.");
  }

  const now = nowIso();

  const quote: ConversionQuote = {
    conversionQuoteId: createId("conversion_quote"),
    walletId: params.walletId,
    userId: params.userId,
    sourceCoin: params.sourceCoin,
    targetCoin: params.targetCoin,
    sourceAmount: params.sourceAmount,
    targetAmount: calculateTargetAmount(params),
    conversionRate: params.conversionRate,
    conversionFeeRate: params.conversionFeeRate,
    conversionFeeAmount: calculateFeeAmount(params),
    sourceState: params.sourceState,
    status: "created",
    expiresAt: addHours(new Date(), params.expiresInHours ?? 1),
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };

  store.quotes.set(quote.conversionQuoteId, quote);

  return quote;
}

export function getConversionQuote(
  conversionQuoteId: string
): ConversionQuote | null {
  return store.quotes.get(conversionQuoteId) ?? null;
}

function createLiquidityReserve(params: {
  conversionQuoteId: string;
  walletId: string;
  userId: string;
  coinCode: CoinCode;
  amount: number;
}): LiquidityReserve {
  const now = nowIso();

  const reserve: LiquidityReserve = {
    liquidityReserveId: createId("liquidity_reserve"),
    conversionQuoteId: params.conversionQuoteId,
    walletId: params.walletId,
    userId: params.userId,
    coinCode: params.coinCode,
    amount: params.amount,
    status: "reserved",
    createdAt: now,
    updatedAt: now
  };

  store.reserves.set(reserve.liquidityReserveId, reserve);

  return reserve;
}

export function getLiquidityReservesForQuote(
  conversionQuoteId: string
): LiquidityReserve[] {
  return Array.from(store.reserves.values()).filter(
    (reserve) => reserve.conversionQuoteId === conversionQuoteId
  );
}

export function verifyStoredConversionQuote(
  input: Omit<
    ConversionSignalInput,
    | "conversionQuoteId"
    | "walletId"
    | "userId"
    | "sourceCoin"
    | "targetCoin"
    | "sourceAmount"
    | "sourceState"
    | "conversionRate"
    | "conversionFeeRate"
  > & {
    conversionQuoteId: string;
  }
): ConversionVerificationResult {
  const quote = getConversionQuote(input.conversionQuoteId);

  if (!quote) {
    throw new Error("Conversion quote not found.");
  }

  if (new Date(quote.expiresAt).getTime() < Date.now()) {
    const expired: ConversionQuote = {
      ...quote,
      status: "expired",
      updatedAt: nowIso()
    };

    store.quotes.set(expired.conversionQuoteId, expired);

    throw new Error("Conversion quote expired.");
  }

  const result = verifyConversionQuote({
    ...input,
    conversionQuoteId: quote.conversionQuoteId,
    walletId: quote.walletId,
    userId: quote.userId,
    sourceCoin: quote.sourceCoin,
    targetCoin: quote.targetCoin,
    sourceAmount: quote.sourceAmount,
    sourceState: quote.sourceState,
    conversionRate: quote.conversionRate,
    conversionFeeRate: quote.conversionFeeRate,
    metadata: {
      ...input.metadata
    }
  });

  let nextStatus: ConversionQuote["status"];

  switch (result.status) {
    case "conversion_approved":
      nextStatus = "completed";
      break;
    case "conversion_pending":
      nextStatus = "pending";
      break;
    case "suspicious":
      nextStatus = "suspicious";
      break;
    case "conversion_rejected":
    case "liquidity_unavailable":
    case "wallet_locked":
      nextStatus = "rejected";
      break;
    case "quote_created":
    default:
      nextStatus = "created";
      break;
  }

  const nextQuote: ConversionQuote = {
    ...quote,
    targetAmount: result.targetAmount,
    conversionFeeAmount: result.conversionFeeAmount,
    status: nextStatus,
    completedAt: nextStatus === "completed" ? nowIso() : quote.completedAt,
    updatedAt: nowIso()
  };

  store.quotes.set(nextQuote.conversionQuoteId, nextQuote);
  store.verificationResults.set(result.conversionQuoteId, result);

  if (result.status === "conversion_approved") {
    createLiquidityReserve({
      conversionQuoteId: quote.conversionQuoteId,
      walletId: quote.walletId,
      userId: quote.userId,
      coinCode: quote.targetCoin,
      amount: result.targetAmount
    });
  }

  return result;
}

export function getConversionVerificationResult(
  conversionQuoteId: string
): ConversionVerificationResult | null {
  return store.verificationResults.get(conversionQuoteId) ?? null;
}

export function resetConversionStoreForTests(): void {
  store.quotes.clear();
  store.verificationResults.clear();
  store.reserves.clear();
}
