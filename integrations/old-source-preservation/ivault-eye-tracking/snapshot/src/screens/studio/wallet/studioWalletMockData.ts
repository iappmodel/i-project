import type { RevealEligibilityPost } from "../magic/evaluateRevealEligibility";
import type { StudioWalletAccount } from "./studioWalletTypes";

const now = () => new Date().toISOString();

function bal(
  coin: "iCoin" | "vCoin" | "aCoin" | "uCoin",
  available: number,
  pending = 0,
  reserved = 0,
  lifetimeEarned = 0,
  lifetimeSpent = 0
) {
  return { coin, available, pending, reserved, lifetimeEarned, lifetimeSpent };
}

export const MOCK_STUDIO_POST_ID = "post_demo_magic_001";

export function createMockStudioWalletAccounts(): StudioWalletAccount[] {
  const t = now();
  return [
    {
      id: "acct_viewer_demo",
      userId: "user_viewer_demo",
      type: "viewer",
      displayName: "Viewer Demo",
      balances: [
        bal("iCoin", 25, 0, 0, 120, 95),
        bal("vCoin", 5),
        bal("aCoin", 120),
        bal("uCoin", 14),
      ],
      trustScore: 72,
      age: 21,
      isVerifiedHuman: true,
      isFollower: false,
      isSubscriber: false,
    },
    {
      id: "acct_creator_demo",
      userId: "user_mock_creator_01",
      type: "creator",
      displayName: "Creator Demo",
      balances: [
        bal("iCoin", 12, 4.25, 0, 890, 120),
        bal("vCoin", 2),
        bal("aCoin", 800),
        bal("uCoin", 63),
      ],
    },
    {
      id: "acct_platform",
      userId: "platform_i",
      type: "platform",
      displayName: "[ i ] Platform",
      balances: [bal("iCoin", 0), bal("vCoin", 0), bal("aCoin", 0), bal("uCoin", 0)],
    },
    {
      id: "acct_escrow",
      userId: "escrow_magic",
      type: "escrow",
      displayName: "Magic Escrow",
      balances: [bal("iCoin", 0), bal("vCoin", 0), bal("aCoin", 0), bal("uCoin", 0)],
    },
    {
      id: "acct_reward_pool",
      userId: "reward_pool",
      type: "reward_pool",
      displayName: "Reward Pool",
      balances: [bal("iCoin", 1000, 0, 0, 1_000_000, 0), bal("aCoin", 50000)],
    },
  ];
}

export function createMockStudioSimPost(): RevealEligibilityPost & { postId: string } {
  const publishedAt = new Date(Date.now() - 86_400_000).toISOString();
  return {
    postId: MOCK_STUDIO_POST_ID,
    verifiedViews: 63,
    totalTips: 63,
    publishedAt,
  };
}
