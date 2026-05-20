/**
 * [ i ] Studio — shared API result types (Stage 8 wire shape).
 */

export type UserId = string & { readonly __brand: "UserId" };
export type ProjectId = string & { readonly __brand: "ProjectId" };
export type AssetId = string & { readonly __brand: "AssetId" };
export type TrackId = string & { readonly __brand: "TrackId" };
export type ClipId = string & { readonly __brand: "ClipId" };
export type MagicRevealId = string & { readonly __brand: "MagicRevealId" };
export type PostId = string & { readonly __brand: "PostId" };
export type CampaignId = string & { readonly __brand: "CampaignId" };
export type WalletAccountId = string & { readonly __brand: "WalletAccountId" };
export type LedgerEntryId = string & { readonly __brand: "LedgerEntryId" };
export type VerificationRecordId = string & { readonly __brand: "VerificationRecordId" };
export type DisputeId = string & { readonly __brand: "DisputeId" };
export type EventId = string & { readonly __brand: "EventId" };

export interface Pagination {
  limit: number;
  cursor?: string;
  nextCursor?: string;
  hasMore: boolean;
}

/** Financial / authoritative mutations must carry idempotency + actor (server validates). */
export interface MutationMeta {
  requestId: string;
  idempotencyKey: string;
  clientTimestamp: string;
  actorUserId: UserId;
}

export interface ServerDecision {
  allowed: boolean;
  status: string;
  reasons: string[];
  warnings?: string[];
  requiredActions?: string[];
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  traceId?: string;
}

export interface ApiError {
  ok: false;
  error: ApiErrorBody;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> {
  return meta === undefined ? { ok: true, data } : { ok: true, data, meta };
}

export function apiError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  traceId?: string
): ApiError {
  return {
    ok: false,
    error: { code, message, details, traceId },
  };
}
