import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { supabaseAdmin } from "../config/supabase";
import { createAdminRequestRiskContext } from "../modules/admin-risk/admin-risk.service";
import { fail } from "../shared/api-response";
import { COMMON_ERRORS } from "../shared/errors";

export type AuthContext = {
  userId: string;
  accessToken: string;
};

export type AdminAuthContext = {
  userId: string;
  accessToken: string;
  adminUserId: string;
  permissions: string[];
};

export async function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json(fail(COMMON_ERRORS.authRequired, req.requestId ?? "unknown"));
  }

  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res
      .status(401)
      .json(fail(COMMON_ERRORS.authRequired, req.requestId ?? "unknown"));
  }

  req.auth = {
    userId: data.user.id,
    accessToken: token
  };

  next();
}

export function requireWorkerSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-worker-secret");

  if (provided !== env.WORKER_API_SECRET) {
    return res
      .status(403)
      .json(fail(COMMON_ERRORS.permissionDenied, req.requestId ?? "unknown"));
  }

  next();
}

/** Local / emergency only — do not mount on admin API routes in production. */
export function requireAdminSecret(req: Request, res: Response, next: NextFunction) {
  const secret = env.ADMIN_API_SECRET;
  const provided = req.header("x-admin-secret");

  if (!secret || provided !== secret) {
    return res
      .status(403)
      .json(fail(COMMON_ERRORS.permissionDenied, req.requestId ?? "unknown"));
  }

  next();
}

async function rpcRecordAdminAction(params: {
  p_auth_user_id: string;
  p_action_key: string;
  p_permission_key: string | null;
  p_target_type: string | null;
  p_target_id: string | null;
  p_request_id: string | null;
  p_endpoint: string | null;
  p_method: string | null;
  p_decision: string;
  p_reason: string | null;
  p_metadata: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.rpc("record_admin_action", {
    p_auth_user_id: params.p_auth_user_id,
    p_action_key: params.p_action_key,
    p_permission_key: params.p_permission_key,
    p_target_type: params.p_target_type,
    p_target_id: params.p_target_id,
    p_request_id: params.p_request_id,
    p_endpoint: params.p_endpoint,
    p_method: params.p_method,
    p_decision: params.p_decision,
    p_reason: params.p_reason,
    p_metadata: params.p_metadata
  });

  if (error) {
    /* best-effort audit; do not block request flow */
  }
}

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  const requestId = req.requestId ?? "unknown";
  const adminSessionId =
    req.header("x-admin-session-id") ??
    req.header("x-session-id") ??
    null;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json(fail(COMMON_ERRORS.authRequired, requestId));
  }

  const token = authHeader.slice("Bearer ".length);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return res.status(401).json(fail(COMMON_ERRORS.authRequired, requestId));
  }

  const userId = userData.user.id;

  const { data: adminRows, error: adminError } = await supabaseAdmin
    .from("admin_user_permission_detail")
    .select("*")
    .eq("auth_user_id", userId);

  if (adminError) {
    return next(adminError);
  }

  if (!adminRows || adminRows.length === 0) {
    await rpcRecordAdminAction({
      p_auth_user_id: userId,
      p_action_key: "admin_auth_denied",
      p_permission_key: null,
      p_target_type: null,
      p_target_id: null,
      p_request_id: requestId,
      p_endpoint: req.path,
      p_method: req.method,
      p_decision: "denied",
      p_reason: "user is not an active admin",
      p_metadata: {}
    });

    return res.status(403).json(fail(COMMON_ERRORS.permissionDenied, requestId));
  }

  const permissions = Array.from(
    new Set(adminRows.map((row: { permission_key: string }) => String(row.permission_key)))
  );

  req.admin = {
    userId,
    accessToken: token,
    adminUserId: String(adminRows[0].admin_user_id),
    permissions
  };
  req.adminSessionId = adminSessionId;

  try {
    const riskContext = await createAdminRequestRiskContext({
      req,
      adminAuthUserId: userId
    });

    req.adminRisk = riskContext;
  } catch (_err) {
    /*
      Do not fail read-only admin auth because risk context failed.
      Sensitive write RPCs still evaluate latest context or fall back.
    */
    req.adminRisk = null;
  }

  if (adminSessionId) {
    const { error: sessionError } = await supabaseAdmin.rpc(
      "require_admin_session_allowed",
      {
        p_admin_auth_user_id: userId,
        p_session_id: adminSessionId,
        p_action_key: "admin_request",
        p_request_id: requestId,
        p_metadata: {
          source: "admin_auth_middleware"
        }
      }
    );

    if (sessionError) {
      return res.status(403).json({
        ok: false,
        data: null,
        error: {
          code: "ADMIN_SESSION_REAUTH_REQUIRED",
          category: "permission",
          message: sessionError.message,
          retryable: false,
          httpStatus: 403
        },
        requestId
      });
    }
  }

  const { error: seenError } = await supabaseAdmin
    .from("admin_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (seenError) {
    return next(seenError);
  }

  next();
}

export function requireAdminPermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const admin = req.admin;
    const requestId = req.requestId ?? "unknown";

    if (!admin) {
      return res.status(403).json(fail(COMMON_ERRORS.permissionDenied, requestId));
    }

    if (!admin.permissions.includes(permissionKey)) {
      await rpcRecordAdminAction({
        p_auth_user_id: admin.userId,
        p_action_key: "admin_permission_denied",
        p_permission_key: permissionKey,
        p_target_type: null,
        p_target_id: null,
        p_request_id: requestId,
        p_endpoint: req.path,
        p_method: req.method,
        p_decision: "denied",
        p_reason: "missing required permission",
        p_metadata: {
          availablePermissions: admin.permissions
        }
      });

      return res.status(403).json(fail(COMMON_ERRORS.permissionDenied, requestId));
    }

    await rpcRecordAdminAction({
      p_auth_user_id: admin.userId,
      p_action_key: "admin_permission_allowed",
      p_permission_key: permissionKey,
      p_target_type: null,
      p_target_id: null,
      p_request_id: requestId,
      p_endpoint: req.path,
      p_method: req.method,
      p_decision: "allowed",
      p_reason: null,
      p_metadata: {}
    });

    next();
  };
}
