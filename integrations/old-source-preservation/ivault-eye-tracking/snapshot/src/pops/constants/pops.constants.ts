export const POPS_MVP_VERSION = "POPS_MVP_V1";
export const POPS_SCORING_MODEL_VERSION = "POPS_SCORING_MODEL_V1";
export const POPS_RULE_VERSION = "POPS_RULES_V1";
export const POPS_PRIVACY_POLICY_VERSION = "POPS_PRIVACY_POLICY_V1";

export const POPS_DEFAULT_REQUIRED_DURATION_MS = 30_000;
/** Wall-clock seconds matching {@link POPS_DEFAULT_REQUIRED_DURATION_MS} (demo default). */
export const POPS_DEFAULT_REQUIRED_WATCH_SECONDS = POPS_DEFAULT_REQUIRED_DURATION_MS / 1000;
export const POPS_DEFAULT_REQUIRED_COMPLETION_PCT = 90;
export const POPS_DEFAULT_REWARD_COIN_TYPE = "iCoin";
export const POPS_DEFAULT_REWARD_AMOUNT = 0.25;

/** Always includes the required disclosure sentence for receipts. */
export const POPS_PRIVACY_RECEIPT_DEFAULT_SUMMARY =
  "P.O.P.S verified this moment using screen activity, content progress, app state, and interaction timing. No raw camera or audio was stored.";

export const POPS_HELD_PRIVACY_SUMMARY =
  "P.O.P.S reviewed this moment using screen activity, content progress, app state, and interaction timing. The reward is under review. No raw camera or audio was stored.";

export const POPS_DENIED_PRIVACY_SUMMARY =
  "P.O.P.S checked this moment against the offer requirements. No raw camera or audio was stored.";

/** Sponsored-watch offer line (local demo). */
export const POPS_SPONSORED_WATCH_OFFER_LINE =
  "Watch 30 seconds. Earn 0.25 iCoins after verification.";
