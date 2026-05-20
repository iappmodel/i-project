import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { validateQuery } from "../../middleware/validate-query";
import { ok } from "../../shared/api-response";
import { paginationQuerySchema } from "../../shared/pagination.validation";
import { uuidSchema } from "../../shared/validation";
import { createWithdrawal, getWithdrawal, getWithdrawalHistory } from "./withdrawals.service";
import { createWithdrawalSchema } from "./withdrawals.validation";

export const withdrawalsRouter = Router();

withdrawalsRouter.post("/", requireUserAuth, validateBody(createWithdrawalSchema), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const body = req.validatedBody!;

    const data = await createWithdrawal({
      userId: auth.userId,
      walletId: body.walletId,
      amountMinor: body.amountMinor,
      currencyCode: body.currencyCode,
      providerKey: body.providerKey,
      idempotencyKey: body.idempotencyKey,
      requestId: req.requestId ?? "unknown",
      metadata: body.metadata ?? {}
    });

    return res.status(201).json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    return next(err);
  }
});

withdrawalsRouter.get("/", requireUserAuth, validateQuery(paginationQuerySchema), async (req, res, next) => {
  try {
    const auth = req.auth!;
    const query = req.validatedQuery!;

    const data = await getWithdrawalHistory(auth.accessToken, auth.userId, query.limit, query.cursor);
    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    return next(err);
  }
});

withdrawalsRouter.get("/:id", requireUserAuth, async (req, res, next) => {
  try {
    const parsed = uuidSchema.safeParse(req.params.id);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          category: "validation",
          message: "The request is invalid.",
          retryable: false,
          httpStatus: 400
        },
        requestId: req.requestId ?? "unknown"
      });
    }

    const auth = req.auth!;
    const data = await getWithdrawal(auth.accessToken, auth.userId, parsed.data);

    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    return next(err);
  }
});
