import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { paginationQuerySchema } from "../../shared/pagination.validation";
import { getRewardHistory } from "./rewards.service";

export const rewardsRouter = Router();

rewardsRouter.get("/history", requireUserAuth, validateQuery(paginationQuerySchema), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const query = req.validatedQuery!;
    const data = await getRewardHistory(auth.accessToken, auth.userId, query.limit, query.cursor);

    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    return next(err);
  }
});
