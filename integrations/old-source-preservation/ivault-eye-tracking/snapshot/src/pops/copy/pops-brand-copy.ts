import {
  POPS_TRUST_CONTRACT_BRAND,
  POPS_TRUST_CONTRACT_CAMPAIGN_DISCLAIMER_SHORT,
  POPS_TRUST_CONTRACT_CANONICAL,
  POPS_TRUST_CONTRACT_CREATOR,
  POPS_TRUST_CONTRACT_INVESTOR_SUMMARY,
  POPS_TRUST_CONTRACT_PRIVACY_RECEIPT_INTRO,
  POPS_TRUST_CONTRACT_SHORT
} from "./pops-trust-contract";

/** Brand and partner-facing lines (campaigns, ads, B2B). */
export const POPS_BRAND_TAGLINE = POPS_TRUST_CONTRACT_SHORT;

export const POPS_BRAND_VALUE_PROP_PRIMARY = POPS_TRUST_CONTRACT_BRAND;

export const POPS_BRAND_VALUE_PROP_CREATOR = POPS_TRUST_CONTRACT_CREATOR;

/** Creator program and dashboard companion copy. */
export const POPS_CREATOR_COPY = {
  headline: POPS_TRUST_CONTRACT_CREATOR,
  dashboardHint:
    "Moment confidence and presence confidence explain how offers scored your session—check the privacy receipt for signal categories.",
  qualityNote:
    "Earn from real attention: verification level protects you and honest audiences from empty traffic."
} as const;

export const POPS_BRAND_EXPLAINER_LONG = POPS_TRUST_CONTRACT_CANONICAL;

/** Hero or deck subhead. */
export const POPS_BRAND_SUBHEAD =
  "Verified human moments replace guesswork—presence confidence, signal categories, and privacy receipts by default.";

/** Short legal-style campaign footnote (use with counsel as needed). */
export const POPS_BRAND_CAMPAIGN_DISCLAIMER = POPS_TRUST_CONTRACT_CAMPAIGN_DISCLAIMER_SHORT;

/** Wallet / reward UI companion line for brand surfaces that mention payouts. */
export const POPS_BRAND_WALLET_COMPANION =
  "Rewards may show as reward pending until verification level and campaign rules are satisfied.";

/** Pull-quote style lines for investor one-pagers. */
export const POPS_BRAND_INVESTOR_PULL_QUOTES = [
  POPS_TRUST_CONTRACT_SHORT,
  "Brands align spend with verified human moments, not empty impressions.",
  "Privacy receipts and signal categories make verification inspectable without default raw storage."
] as const;

/** Ordered bullets for investor appendix (same substance as trust contract investor summary). */
export const POPS_BRAND_INVESTOR_BULLETS = POPS_TRUST_CONTRACT_INVESTOR_SUMMARY;

/** Help center / product education cross-link copy. */
export const POPS_BRAND_LEARN_MORE_CTA = "See how P.O.P.S verifies the moment";

export const POPS_BRAND_PRIVACY_RECEIPT_TEASER = POPS_TRUST_CONTRACT_PRIVACY_RECEIPT_INTRO;
