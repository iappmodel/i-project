import type { MagicReveal, ViewerUnlockScenario } from "./studioTypes";

export {
  type RevealEligibilityViewer,
  type RevealEligibilityPost,
  type RequiredRevealAction,
  evaluateRevealEligibility,
  MOCK_UNLOCK_VIEWER,
  MOCK_UNLOCK_POST,
} from "./magic/evaluateRevealEligibility";

/** Maps `MagicReveal.revealType` to unlock-sheet scenario (viewer + studio preview). */
export function viewerUnlockScenarioFromReveal(r: MagicReveal): ViewerUnlockScenario {
  switch (r.revealType) {
    case "always_hidden":
      return "always_hidden";
    case "free_tap_reveal":
      return "free";
    case "tip_to_reveal":
      return "tip";
    case "pay_to_reveal":
      return "pay";
    case "watch_to_reveal":
      return "watch";
    case "follow_to_reveal":
      return "follow";
    case "subscribe_to_reveal":
      return "subscribe";
    case "trust_to_reveal":
      return "trust";
    case "age_to_reveal":
      return "age";
    case "location_to_reveal":
      return "location";
    case "time_to_reveal":
      return "time";
    case "collective_reveal":
      return "collective";
    case "creator_approval_reveal":
      return "creator_approval";
    default:
      return "free";
  }
}

export {
  assertMagicPublishAllowed,
  collectMagicPublishErrors,
  collectMagicPublishSoftWarnings,
  hasMonetizationWarnings,
} from "./magic/magicSafetyRules";
