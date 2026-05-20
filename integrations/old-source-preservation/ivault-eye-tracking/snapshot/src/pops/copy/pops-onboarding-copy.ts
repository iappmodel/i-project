import {
  POPS_TRUST_CONTRACT_BRAND,
  POPS_TRUST_CONTRACT_CANONICAL,
  POPS_TRUST_CONTRACT_CREATOR,
  POPS_TRUST_CONTRACT_HUMAN,
  POPS_TRUST_CONTRACT_PRIVACY,
  POPS_TRUST_CONTRACT_SHORT,
  POPS_TRUST_CONTRACT_WALLET
} from "./pops-trust-contract";

/** Screen titles and primary lines for P.O.P.S onboarding flows. */
export const POPS_ONBOARDING_WELCOME_TITLE = "Meet P.O.P.S";
export const POPS_ONBOARDING_WELCOME_SUBTITLE =
  "We verify the moment—not empty impressions—before rewards or campaign value count.";

export const POPS_ONBOARDING_WHAT_TITLE = "What is P.O.P.S?";
export const POPS_ONBOARDING_WHAT_BODY = POPS_TRUST_CONTRACT_CANONICAL;

export const POPS_ONBOARDING_WHY_TITLE = "Why it matters";
export const POPS_ONBOARDING_WHY_BODY = POPS_TRUST_CONTRACT_HUMAN;

export const POPS_ONBOARDING_HOW_TITLE = "How it works";
export const POPS_ONBOARDING_HOW_BULLETS = [
  "P.O.P.S combines signal categories like screen activity, content progress, interaction timing, and campaign rules.",
  "Optional visual presence may be used only for some high-value moments—and the app explains stronger checks before they run.",
  "Local processing is preferred; verification scores and privacy receipts explain outcomes."
] as const;

export const POPS_ONBOARDING_PRIVACY_TITLE = "Your privacy";
export const POPS_ONBOARDING_PRIVACY_BODY = POPS_TRUST_CONTRACT_PRIVACY;

export const POPS_ONBOARDING_WALLET_TITLE = "Rewards";
export const POPS_ONBOARDING_WALLET_BODY = POPS_TRUST_CONTRACT_WALLET;

export const POPS_ONBOARDING_CREATOR_NOTE = POPS_TRUST_CONTRACT_CREATOR;
export const POPS_ONBOARDING_BRAND_NOTE = POPS_TRUST_CONTRACT_BRAND;

export const POPS_ONBOARDING_CONFIRM_CTA = "Continue";
export const POPS_ONBOARDING_DONE_CTA = "Got it";

/** One-line recap for final onboarding step or modal footer. */
export const POPS_ONBOARDING_RECAP = POPS_TRUST_CONTRACT_SHORT;
