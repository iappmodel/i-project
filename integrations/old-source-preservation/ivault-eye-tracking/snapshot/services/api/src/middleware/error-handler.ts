import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { fail } from "../shared/api-response";

function mapRawError(raw: unknown): string {
  if (raw instanceof Error) {
    return raw.message;
  }
  return String(raw ?? "Unknown error");
}

export async function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId ?? "unknown";
  const rawError = mapRawError(err);
  let errorCode = "SYSTEM_INTERNAL_ERROR";

  try {
    const resolved = await supabaseAdmin.rpc("resolve_error_code_from_raw_error", {
      p_raw_error: rawError
    });

    if (resolved.data) {
      errorCode = resolved.data;
    }

    await supabaseAdmin.rpc("record_error_event", {
      p_error_code: errorCode,
      p_request_id: requestId,
      p_idempotency_key: req.body?.idempotencyKey ?? null,
      p_actor_type: req.auth ? "user" : "system",
      p_user_id: req.auth?.userId ?? null,
      p_wallet_id: req.body?.walletId ?? null,
      p_source: "api",
      p_endpoint: req.path,
      p_function_name: null,
      p_message: null,
      p_raw_error: rawError,
      p_related_entity_type: null,
      p_related_entity_id: null,
      p_metadata: {
        method: req.method
      }
    });

    const apiError = await supabaseAdmin.rpc("build_api_error_response", {
      p_error_code: errorCode,
      p_request_id: requestId,
      p_details: {}
    });

    const payload = apiError.data;
    const httpStatus =
      payload?.error?.httpStatus && Number.isInteger(payload.error.httpStatus)
        ? payload.error.httpStatus
        : 500;

    return res.status(httpStatus).json(payload);
  } catch {
    return res.status(500).json(
      fail(
        {
          code: "SYSTEM_INTERNAL_ERROR",
          category: "system",
          message: "Something went wrong. Please try again.",
          retryable: true,
          httpStatus: 500
        },
        requestId
      )
    );
  }
}
