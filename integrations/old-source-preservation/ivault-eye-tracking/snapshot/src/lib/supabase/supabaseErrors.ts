/**
 * Normalize PostgREST / Supabase errors → Stage 8 ApiError.
 */

import { apiError, type ApiError } from "../../screens/studio/backend/studioApiTypes";

export function normalizeSupabaseError(error: unknown): { message: string; code?: string; details?: Record<string, unknown> } {
  if (error && typeof error === "object") {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    return {
      message: e.message ?? "Supabase request failed",
      code: e.code,
      details: { details: e.details, hint: e.hint },
    };
  }
  return { message: String(error) };
}

export function toApiError(error: unknown, fallbackCode: string): ApiError {
  const n = normalizeSupabaseError(error);
  return apiError(n.code ?? fallbackCode, n.message, n.details);
}

export function isRlsError(error: unknown): boolean {
  const n = normalizeSupabaseError(error);
  const c = (n.code ?? "").toUpperCase();
  if (c === "42501" || c === "PGRST301") return true;
  const msg = n.message.toLowerCase();
  return msg.includes("row-level security") || msg.includes("permission denied") || msg.includes("rls");
}

export function isUniqueViolation(error: unknown): boolean {
  const n = normalizeSupabaseError(error);
  return n.code === "23505";
}

export function isForeignKeyViolation(error: unknown): boolean {
  const n = normalizeSupabaseError(error);
  return n.code === "23503";
}

export function isNotFoundError(error: unknown): boolean {
  const n = normalizeSupabaseError(error);
  return n.code === "PGRST116" || /no rows|not found/i.test(n.message);
}
