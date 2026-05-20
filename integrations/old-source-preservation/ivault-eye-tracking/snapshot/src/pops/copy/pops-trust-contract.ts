import { POPS_EXPANDED_NAME, POPS_NAME } from "../../../services/api/src/pops/constants/pops.constants";

/** Public trust contract: canonical and audience-specific explanations of P.O.P.S. */
export const POPS_TRUST_CONTRACT_PRODUCT_NAME = POPS_NAME;
export const POPS_TRUST_CONTRACT_EXPANDED_NAME = POPS_EXPANDED_NAME;

export const POPS_TRUST_CONTRACT_CANONICAL =
  `${POPS_NAME} means ${POPS_EXPANDED_NAME}. It verifies that a real human moment happened before rewards, trust, or campaign value are created.`;

export const POPS_TRUST_CONTRACT_SHORT = `${POPS_NAME} proves the moment was real.`;

export const POPS_TRUST_CONTRACT_HUMAN =
  "Your attention should not be treated as free. P.O.P.S helps verify when you were genuinely present so rewards can be issued fairly.";

export const POPS_TRUST_CONTRACT_BRAND =
  `${POPS_NAME} helps brands pay for verified human moments instead of empty impressions.`;

export const POPS_TRUST_CONTRACT_CREATOR =
  `${POPS_NAME} helps creators earn from real attention, not fake traffic.`;

export const POPS_TRUST_CONTRACT_PRIVACY =
  `${POPS_NAME} stores verification scores and receipts, not raw human capture by default.`;

export const POPS_TRUST_CONTRACT_WALLET =
  `Rewards verified by ${POPS_NAME} may appear as pending before becoming available.`;

/** Wallet and payout surfaces: short lines derived from the trust contract. */
export const POPS_WALLET_COPY = {
  rewardPendingLine: POPS_TRUST_CONTRACT_WALLET,
  verificationBeforeRelease:
    "Some rewards stay in reward pending until the verification level required by the offer is met.",
  privacyReceiptHint:
    "Open your privacy receipt to see signal categories used and whether raw data was stored for that session."
} as const;

/** Preferred vocabulary for user-facing and partner-facing copy. */
export const POPS_TRUST_CONTRACT_PREFERRED_TERMS = [
  "verify the moment",
  "humane factor",
  "presence confidence",
  "reward pending",
  "privacy receipt",
  "signal categories",
  "local processing",
  "verification level",
  "moment confidence"
] as const;

/** Phrases to avoid in public copy (internal guardrails; admin-only exceptions noted in spec). */
export const POPS_TRUST_CONTRACT_FORBIDDEN_COPY = [
  "We watch you",
  "Eye tracking proves attention",
  "We know your emotions",
  "We monitor your face",
  "We record your behavior",
  "Surveillance",
  "Obey to earn",
  "Suspicious user",
  "Fraud detected"
] as const;

export const POPS_TRUST_CONTRACT_FORBIDDEN_NOTE =
  "Avoid “Fraud detected” in user-facing surfaces unless admin or internal tooling; use verification and review language instead.";

export const POPS_TRUST_CONTRACT_INVESTOR_SUMMARY = [
  `${POPS_NAME} (${POPS_EXPANDED_NAME}) is a verification layer that scores whether a human moment likely occurred before value is attributed.`,
  "Design default: multimodal presence signals and campaign rules—not a single biometric modality.",
  "Privacy default: verification scores and privacy receipts; raw capture is not stored by default.",
  "Economics: rewards may remain pending until verification completes; held or denied outcomes are explainable and disputable when dispute support is enabled."
] as const;

export const POPS_TRUST_CONTRACT_CAMPAIGN_DISCLAIMER_SHORT =
  `This offer may use ${POPS_NAME} to verify the moment met campaign rules before rewards or reach are counted.`;

export const POPS_TRUST_CONTRACT_PRIVACY_RECEIPT_INTRO =
  `Money-affecting ${POPS_NAME} sessions produce a privacy receipt listing signal categories used and whether raw data was stored.`;
