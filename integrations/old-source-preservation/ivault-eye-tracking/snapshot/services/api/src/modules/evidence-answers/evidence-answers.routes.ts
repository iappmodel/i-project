import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { ok } from "../../shared/api-response";
import { generateEvidenceAnswerSchema } from "./evidence-answers.validation";
import {
  createPrivateRoomEvidenceAnswerSession,
  generateEvidenceAnswer
} from "./evidence-answers.service";

export const evidenceAnswersRouter = Router();

evidenceAnswersRouter.post(
  "/private-room/:privateRoomKey/session",
  requireUserAuth,
  async (req, res, next) => {
    try {
      const authUser = (req as any).auth;

      const data = await createPrivateRoomEvidenceAnswerSession({
        authUserId: authUser.userId,
        privateRoomKey: req.params.privateRoomKey,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.status(201).json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);

evidenceAnswersRouter.post(
  "/generate",
  validateBody(generateEvidenceAnswerSchema),
  async (req, res, next) => {
    try {
      const body = (req as any).validatedBody;
      const authUser = (req as any).auth;

      const data = await generateEvidenceAnswer({
        authUserId: authUser?.userId,
        answerToken: body.answerToken,
        questionText: body.questionText,
        limit: body.limit,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        requestId: (req as any).requestId
      });

      return res.json(ok(data, (req as any).requestId));
    } catch (err) {
      next(err);
    }
  }
);
