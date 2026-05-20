import { Router } from "express";
import { requireUserAuth } from "../../middleware/auth";
import { ok } from "../../shared/api-response";
import { getUserHomeSnapshot } from "./me.service";

export const meRouter = Router();

meRouter.get("/home", requireUserAuth, async (req, res, next) => {
  try {
    const auth = req.auth!;
    const data = await getUserHomeSnapshot(auth.accessToken, auth.userId);
    return res.json(ok(data, req.requestId ?? "unknown"));
  } catch (err) {
    return next(err);
  }
});
