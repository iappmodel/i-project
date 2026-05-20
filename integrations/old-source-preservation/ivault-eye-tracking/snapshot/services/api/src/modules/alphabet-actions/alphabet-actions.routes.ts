import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { runDatabaseBackedPipelineRuntime } from "@/lib/alphabet/runtime/pipeline-runtime";
import type { ActionApiAuthContext, ActionApiRequestPayload } from "@/types/alphabet/action-api.types";
import { getActionIntentDb } from "@/lib/alphabet/db-repositories/action-intents.repository";
import { getPipelineRecordDb } from "@/lib/alphabet/db-repositories/pipelines.repository";

export const alphabetActionsRouter = Router();

function getAuthContext(req: Request): ActionApiAuthContext {
  const userId = req.header("x-user-id") ?? null;
  const actorUserId = req.header("x-actor-user-id") ?? null;
  const sessionId = req.header("x-session-id") ?? null;
  const deviceId = req.header("x-device-id") ?? null;
  const clientRequestId = req.header("x-client-request-id") ?? null;
  const role = req.header("x-role");

  return {
    authenticatedUserId: userId,
    actorUserId,
    sessionId,
    deviceId,
    clientRequestId,
    ipRegionCode: req.header("x-region-code"),
    isAuthenticated: Boolean(userId),
    isAdmin: role === "admin",
    isModerator: role === "moderator",
    isSystem: role === "system"
  };
}

function resolveHttpStatus(result: Awaited<ReturnType<typeof runDatabaseBackedPipelineRuntime>>): number {
  if (typeof result.httpStatus === "number") return result.httpStatus;
  if (result.ok) return 202;
  return 400;
}

alphabetActionsRouter.post("/actions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as ActionApiRequestPayload;
    const authContext = getAuthContext(req);

    const result = await runDatabaseBackedPipelineRuntime({
      mode: authContext.isAdmin || authContext.isModerator ? "admin_api" : "public_api",
      payload: body,
      authContext,
      requestHeaders: {
        userId: req.header("x-user-id") ?? null,
        role: req.header("x-role") ?? null,
        region: req.header("x-region-code") ?? null
      }
    });

    return res.status(resolveHttpStatus(result)).json(result.publicResponse);
  } catch (err) {
    return next(err);
  }
});

alphabetActionsRouter.get(
  "/actions/:actionIntentId/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { actionIntentId } = req.params;
      const record = await getActionIntentDb(actionIntentId);

      if (!record) {
        return res.status(404).json({
          ok: false,
          status: "not_found",
          message: "Action intent not found."
        });
      }

      return res.json({
        ok: true,
        actionIntentId: record.action_intent_id,
        status: record.status,
        intentType: record.intent_type,
        updatedAt: record.updated_at
      });
    } catch (err) {
      return next(err);
    }
  }
);

alphabetActionsRouter.get("/pipelines/:pipelineId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pipelineId } = req.params;
    const record = await getPipelineRecordDb(pipelineId);

    if (!record) {
      return res.status(404).json({
        ok: false,
        status: "not_found",
        message: "Pipeline not found."
      });
    }

    return res.json({
      ok: true,
      pipelineId: record.pipeline_id,
      status: record.status,
      actionIntentId: record.action_intent_id,
      policyDecisionId: record.policy_decision_id,
      sagaId: record.saga_id,
      executionRequestIds: record.execution_request_ids,
      auditRecordIds: record.audit_record_ids,
      notificationIds: record.notification_ids,
      updatedAt: record.updated_at
    });
  } catch (err) {
    return next(err);
  }
});
