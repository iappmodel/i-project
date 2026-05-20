import { WITHDRAWAL_RULES } from "../../data/alphabet/withdrawal-rules";
import type {
  WithdrawalPayoutMethod,
  WithdrawalRequest,
  WithdrawalSignalInput,
  WithdrawalVerificationResult
} from "../../types/alphabet/withdrawal.types";
import { verifyWithdrawalRequest } from "./withdrawal-engine";

type WithdrawalStoreState = {
  requests: Map<string, WithdrawalRequest>;
  verificationResults: Map<string, WithdrawalVerificationResult>;
};

const store: WithdrawalStoreState = {
  requests: new Map(),
  verificationResults: new Map()
};

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function findRule(method: WithdrawalPayoutMethod) {
  return WITHDRAWAL_RULES.find((rule) => rule.active && rule.payoutMethod === method);
}

function calculateFeeAmount(params: {
  requestedAmount: number;
  payoutMethod: WithdrawalPayoutMethod;
}): number {
  const rule = findRule(params.payoutMethod);
  if (!rule) return 0;
  return Number((params.requestedAmount * rule.feeRate + rule.flatFee).toFixed(6));
}

function calculatePayoutAmount(params: {
  requestedAmount: number;
  payoutMethod: WithdrawalPayoutMethod;
}): number {
  const fee = calculateFeeAmount(params);
  return Number(Math.max(0, params.requestedAmount - fee).toFixed(6));
}

export function createWithdrawalRequest(params: {
  walletId: string;
  userId: string;
  sourceCoin: string;
  requestedAmount: number;
  payoutMethod: WithdrawalPayoutMethod;
  region: string;
  countryCode: string;
}): WithdrawalRequest {
  if (params.requestedAmount <= 0) {
    throw new Error("requestedAmount must be greater than zero.");
  }

  const now = nowIso();
  const request: WithdrawalRequest = {
    withdrawalRequestId: createId("withdrawal_request"),
    walletId: params.walletId,
    userId: params.userId,
    sourceCoin: params.sourceCoin,
    requestedAmount: params.requestedAmount,
    payoutAmount: calculatePayoutAmount({
      requestedAmount: params.requestedAmount,
      payoutMethod: params.payoutMethod
    }),
    feeAmount: calculateFeeAmount({
      requestedAmount: params.requestedAmount,
      payoutMethod: params.payoutMethod
    }),
    payoutMethod: params.payoutMethod,
    region: params.region,
    countryCode: params.countryCode,
    status: "created",
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };

  store.requests.set(request.withdrawalRequestId, request);
  return request;
}

export function getWithdrawalRequest(withdrawalRequestId: string): WithdrawalRequest | null {
  return store.requests.get(withdrawalRequestId) ?? null;
}

export function verifyStoredWithdrawalRequest(
  input: Omit<
    WithdrawalSignalInput,
    | "withdrawalRequestId"
    | "walletId"
    | "userId"
    | "sourceCoin"
    | "requestedAmount"
    | "payoutMethod"
    | "region"
    | "countryCode"
  > & {
    withdrawalRequestId: string;
  }
): WithdrawalVerificationResult {
  const request = getWithdrawalRequest(input.withdrawalRequestId);
  if (!request) {
    throw new Error("Withdrawal request not found.");
  }

  const result = verifyWithdrawalRequest({
    ...input,
    withdrawalRequestId: request.withdrawalRequestId,
    walletId: request.walletId,
    userId: request.userId,
    sourceCoin: request.sourceCoin,
    requestedAmount: request.requestedAmount,
    payoutMethod: request.payoutMethod,
    region: request.region,
    countryCode: request.countryCode,
    metadata: {
      ...input.metadata
    }
  });

  const nextStatus: WithdrawalRequest["status"] =
    result.status === "withdrawal_approved"
      ? result.payoutCompletedEvent
        ? "completed"
        : "approved"
      : result.status === "withdrawal_pending_review"
        ? "pending_review"
        : result.status === "withdrawal_held"
          ? "held"
          : result.status === "compliance_blocked"
            ? "compliance_blocked"
            : result.status === "wallet_locked"
              ? "wallet_locked"
              : result.status === "suspicious"
                ? "suspicious"
                : "rejected";

  const next: WithdrawalRequest = {
    ...request,
    payoutAmount: result.payoutAmount,
    feeAmount: result.feeAmount,
    status: nextStatus,
    completedAt: nextStatus === "completed" ? nowIso() : request.completedAt,
    updatedAt: nowIso()
  };

  store.requests.set(next.withdrawalRequestId, next);
  store.verificationResults.set(result.withdrawalRequestId, result);

  return result;
}

export function getWithdrawalVerificationResult(
  withdrawalRequestId: string
): WithdrawalVerificationResult | null {
  return store.verificationResults.get(withdrawalRequestId) ?? null;
}

export function resetWithdrawalStoreForTests(): void {
  store.requests.clear();
  store.verificationResults.clear();
}
