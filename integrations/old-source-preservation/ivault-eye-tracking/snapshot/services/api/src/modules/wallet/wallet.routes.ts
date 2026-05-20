import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { paginationQuerySchema } from "../../shared/pagination.validation";
import { getWalletLedger, getWalletSummary } from "./wallet.service";

export const walletRouter = Router();

walletRouter.get("/summary", requireUserAuth, async (req, res, next) => {
  try {
    const auth = req.auth!;
    const data = await getWalletSummary(auth.accessToken, auth.userId);
    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    return next(err);
  }
});

walletRouter.get("/ledger", requireUserAuth, validateQuery(paginationQuerySchema), async (req, res, next) => {
    try {
      const auth = req.auth!;
      const query = req.validatedQuery!;
      const data = await getWalletLedger(auth.accessToken, auth.userId, query.limit, query.cursor);
      return res.json(ok(data, req.requestId ?? "unknown"));
    } catch (err) {
      return next(err);
    }
});
