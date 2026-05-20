import type { MagicReveal, RevealType } from "../studioTypes";

export type RevealEligibilityViewer = {
  id: string;
  age?: number;
  trustScore: number;
  isVerifiedHuman: boolean;
  isFollower: boolean;
  isSubscriber: boolean;
  walletBalances: Record<string, number>;
  location?: { latitude: number; longitude: number };
};

export type RevealEligibilityPost = {
  verifiedViews: number;
  totalTips: number;
  publishedAt: string;
};

export type RequiredRevealAction =
  | "pay"
  | "tip"
  | "watch_ad"
  | "follow"
  | "subscribe"
  | "verify_age"
  | "build_trust"
  | "verify_human"
  | "move_to_location"
  | "wait"
  | "request_creator_approval";

export function evaluateRevealEligibility(input: {
  reveal: MagicReveal;
  viewer: RevealEligibilityViewer;
  post: RevealEligibilityPost;
  now: string;
  /** Studio unlock sheet: skip inactive status so drafts preview CTAs (safety rules still apply). */
  forPreview?: boolean;
}): {
  eligible: boolean;
  blockedReason?: string;
  requiredAction?: RequiredRevealAction;
  displayMessage: string;
} {
  const { reveal, viewer, post } = input;

  if (!input.forPreview && reveal.status !== "active") {
    return { eligible: false, blockedReason: "inactive_reveal", displayMessage: "This reveal is not available." };
  }

  if (reveal.safety.safetyStatus === "blocked" || reveal.safety.publishBlocked) {
    return {
      eligible: false,
      blockedReason: "blocked_by_safety",
      displayMessage: "This reveal is blocked for safety reasons.",
    };
  }

  if (reveal.eligibility.minAge && (!viewer.age || viewer.age < reveal.eligibility.minAge)) {
    return {
      eligible: false,
      blockedReason: "age_requirement",
      requiredAction: "verify_age",
      displayMessage: `This reveal requires age ${reveal.eligibility.minAge}+.`,
    };
  }

  if (reveal.eligibility.requireVerifiedHuman && !viewer.isVerifiedHuman) {
    return {
      eligible: false,
      blockedReason: "human_verification_required",
      requiredAction: "verify_human",
      displayMessage: "Verify you are a real human to reveal this.",
    };
  }

  if (reveal.eligibility.minTrustScore && viewer.trustScore < reveal.eligibility.minTrustScore) {
    return {
      eligible: false,
      blockedReason: "trust_requirement",
      requiredAction: "build_trust",
      displayMessage: "Your trust score is not high enough to reveal this.",
    };
  }

  if (reveal.eligibility.requireFollower && !viewer.isFollower) {
    return {
      eligible: false,
      blockedReason: "follow_required",
      requiredAction: "follow",
      displayMessage: "Follow the creator to reveal this.",
    };
  }

  if (reveal.eligibility.requireSubscriber && !viewer.isSubscriber) {
    return {
      eligible: false,
      blockedReason: "subscription_required",
      requiredAction: "subscribe",
      displayMessage: "Subscribe to reveal this.",
    };
  }

  if (
    reveal.eligibility.revealAfterVerifiedViews &&
    post.verifiedViews < reveal.eligibility.revealAfterVerifiedViews
  ) {
    return {
      eligible: false,
      blockedReason: "verified_views_threshold",
      requiredAction: "wait",
      displayMessage: `Reveals after ${reveal.eligibility.revealAfterVerifiedViews} verified views.`,
    };
  }

  // Collective reveals allow contributions before the tip goal; goal is enforced at unlock/settlement time.
  if (
    reveal.revealType !== "collective_reveal" &&
    reveal.eligibility.revealAfterTotalTips &&
    post.totalTips < reveal.eligibility.revealAfterTotalTips
  ) {
    return {
      eligible: false,
      blockedReason: "tip_threshold",
      requiredAction: "tip",
      displayMessage: `Community reveal unlocks after ${reveal.eligibility.revealAfterTotalTips} total tips.`,
    };
  }

  switch (reveal.revealType) {
    case "always_hidden":
      return {
        eligible: false,
        blockedReason: "creator_hidden",
        displayMessage: "This area is hidden by the creator.",
      };
    case "free_tap_reveal":
      return { eligible: true, displayMessage: "Tap to reveal." };
    case "tip_to_reveal":
      return { eligible: true, requiredAction: "tip", displayMessage: "Tip the creator to reveal this." };
    case "pay_to_reveal":
      return { eligible: true, requiredAction: "pay", displayMessage: "Pay to reveal this." };
    case "watch_to_reveal":
      return {
        eligible: true,
        requiredAction: "watch_ad",
        displayMessage: "Watch a verified sponsor clip to reveal this.",
      };
    case "follow_to_reveal":
      return { eligible: true, requiredAction: "follow", displayMessage: "Follow to reveal this." };
    case "subscribe_to_reveal":
      return { eligible: true, requiredAction: "subscribe", displayMessage: "Subscribe to reveal this." };
    case "trust_to_reveal":
      return { eligible: true, requiredAction: "build_trust", displayMessage: "Build trust to reveal this." };
    case "age_to_reveal":
      return { eligible: true, requiredAction: "verify_age", displayMessage: "Age verification required." };
    case "location_to_reveal":
      return { eligible: true, requiredAction: "move_to_location", displayMessage: "Location required to reveal." };
    case "time_to_reveal":
      return { eligible: true, requiredAction: "wait", displayMessage: "Available at the scheduled time." };
    case "collective_reveal":
      return { eligible: true, requiredAction: "tip", displayMessage: "Contribute to the community goal." };
    case "creator_approval_reveal":
      return {
        eligible: true,
        requiredAction: "request_creator_approval",
        displayMessage: "Request creator approval to reveal this.",
      };
    default:
      return { eligible: true, displayMessage: "Reveal available." };
  }
}

/** Mock viewer for unlock sheet preview. */
export const MOCK_UNLOCK_VIEWER: RevealEligibilityViewer = {
  id: "viewer_preview",
  age: 21,
  trustScore: 72,
  isVerifiedHuman: true,
  isFollower: false,
  isSubscriber: false,
  walletBalances: { iCoin: 25, vCoin: 0, aCoin: 0, uCoin: 0 },
};

export const MOCK_UNLOCK_POST: RevealEligibilityPost = {
  verifiedViews: 120,
  totalTips: 63,
  publishedAt: new Date().toISOString(),
};
