import type { RuntimePost } from "../../feed/studioFeedTypes";
import type { StudioLedgerEntry } from "../../wallet/studioWalletTypes";
import { sumLedgerByType } from "../../wallet/studioWalletLedger";

export function CreatorEarningsBreakdown({ posts, ledger }: { posts: RuntimePost[]; ledger: StudioLedgerEntry[] }) {
  const postIds = new Set(posts.map((p) => p.id));
  const mine = ledger.filter((e) => e.postId && postIds.has(e.postId));

  const magicUnlock = sumLedgerByType(mine, "magic_creator_pending_credit");
  const tips = mine.filter((e) => e.description?.includes("tip")).reduce((s, e) => s + e.amount, 0) || sumLedgerByType(mine, "magic_unlock_tip");
  const platformFees = sumLedgerByType(mine, "magic_platform_fee");
  const viewerRewards = sumLedgerByType(mine, "magic_viewer_reward");
  const refunds =
    sumLedgerByType(mine, "magic_refund") +
    sumLedgerByType(mine, "magic_settlement_reversal") +
    sumLedgerByType(mine, "magic_reward_reversal");

  const pending = posts.reduce((s, p) => s + p.metrics.creatorPendingEarned, 0);
  const available = posts.reduce((s, p) => s + p.metrics.creatorGrossEarned * 0.2, 0);

  return (
    <div>
      <div className="ist-display" style={{ fontSize: 12, marginBottom: 10 }}>Earnings breakdown</div>
      <div className="ist-panel" style={{ padding: 12, marginBottom: 10, borderColor: "rgba(251,191,36,0.35)" }}>
        <p className="ist-mono" style={{ fontSize: 10, margin: 0, lineHeight: 1.5 }}>
          Pending earnings are not withdrawable until verification and dispute windows clear (simulated settlement truth).
        </p>
      </div>
      <ul className="ist-mono" style={{ fontSize: 11, margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
        <li>Available (mock slice of gross): {available.toFixed(2)}</li>
        <li>Pending (metrics): {pending.toFixed(2)}</li>
        <li>Magic unlock revenue (ledger): {magicUnlock.toFixed(2)}</li>
        <li>Tips (ledger / heuristic): {tips.toFixed(2)}</li>
        <li>Sponsored rewards: {viewerRewards.toFixed(2)} (viewer pool / sponsor)</li>
        <li>Refunds / reversals: {refunds.toFixed(2)}</li>
        <li>Platform fees: {platformFees.toFixed(2)}</li>
        <li>Viewer rewards paid: {viewerRewards.toFixed(2)}</li>
      </ul>
    </div>
  );
}
