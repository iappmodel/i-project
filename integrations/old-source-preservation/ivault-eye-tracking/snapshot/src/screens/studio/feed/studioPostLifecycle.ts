import type { RuntimePost, RuntimePostStatus } from "./studioFeedTypes";
import type { StudioRevealUnlock } from "../wallet/studioWalletTypes";

export function canPausePost(post: RuntimePost): boolean {
  return post.status === "published";
}

export function canArchivePost(post: RuntimePost): boolean {
  return post.status === "published" || post.status === "paused";
}

function hasUnsettledPaidUnlocks(unlocks: StudioRevealUnlock[], postId: string): boolean {
  return unlocks.some(
    (u) =>
      u.postId === postId &&
      u.amount > 0 &&
      (u.settlementStatus === "pending" || u.unlockStatus === "awaiting_confirmation" || u.unlockStatus === "verifying_action")
  );
}

export function canDeletePost(post: RuntimePost, unlocks: StudioRevealUnlock[]): boolean {
  if (post.status === "blocked") return false;
  if (post.status === "draft" || post.status === "archived") return true;
  if (post.status === "deleted") return false;
  if (post.status === "published" || post.status === "paused") {
    return !hasUnsettledPaidUnlocks(unlocks, post.id);
  }
  if (post.status === "under_review") return true;
  return false;
}

export function canEditPost(post: RuntimePost): { caption: boolean; disclosures: boolean; visibility: boolean; media: boolean } {
  const hasUnlocks = post.metrics.magicUnlocks > 0;
  return {
    caption: true,
    disclosures: true,
    visibility: true,
    media: !hasUnlocks,
  };
}

export function canUnpublishPost(post: RuntimePost, unlocks: StudioRevealUnlock[]): { ok: boolean; refundPolicyWarning?: string } {
  const paid = unlocks.filter((u) => u.postId === post.id && u.amount > 0 && u.status !== "refunded");
  if (paid.length > 0) {
    return {
      ok: true,
      refundPolicyWarning:
        "Active or settled paid unlocks exist — unpublishing may require refunds per policy (simulation: review before proceeding).",
    };
  }
  return { ok: true };
}

export function updatePostStatus(post: RuntimePost, newStatus: RuntimePostStatus): RuntimePost {
  const now = new Date().toISOString();
  return { ...post, status: newStatus, updatedAt: now };
}
