import { useMemo } from "react";
import type { RuntimePost } from "../../feed/studioFeedTypes";
import type { RuntimePostActionEvent } from "../../feed/studioFeedTypes";
import type { StudioLedgerEntry, StudioRevealUnlock } from "../../wallet/studioWalletTypes";
import { calculateRevealMetrics } from "../../feed/studioFeedAnalytics";

export function CreatorMagicRevealAnalytics({
  post,
  events,
  unlocks,
  ledger,
}: {
  post: RuntimePost;
  events: RuntimePostActionEvent[];
  unlocks: StudioRevealUnlock[];
  ledger: StudioLedgerEntry[];
}) {
  const rows = useMemo(() => {
    return post.postPackage.magicReveals
      .filter((r) => r.status !== "deleted")
      .map((r) => ({ reveal: r, metrics: calculateRevealMetrics(post, r.id, events, unlocks, ledger) }));
  }, [post, events, unlocks, ledger]);

  const sortedEarn = [...rows].sort((a, b) => b.metrics.grossRevenue - a.metrics.grossRevenue);
  const sortedTap = [...rows].sort((a, b) => b.metrics.taps - a.metrics.taps);
  const sortedCvr = [...rows].sort((a, b) => a.metrics.conversionRate - b.metrics.conversionRate);

  return (
    <div>
      <div className="ist-display" style={{ fontSize: 12, marginBottom: 10 }}>Magic reveal performance</div>
      <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginBottom: 10 }}>
        Top earning: {sortedEarn[0]?.reveal.name ?? "—"} · Most tapped: {sortedTap[0]?.reveal.name ?? "—"} · Lowest CVR:{" "}
        {sortedCvr[0]?.reveal.name ?? "—"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map(({ reveal, metrics }) => (
          <div key={reveal.id} className="ist-panel" style={{ padding: 10 }}>
            <div className="ist-display" style={{ fontSize: 12 }}>{reveal.name}</div>
            <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>
              {reveal.revealType} · {reveal.status}
            </div>
            <ul className="ist-mono" style={{ fontSize: 10, margin: "8px 0 0", paddingLeft: 16, lineHeight: 1.5 }}>
              <li>Taps: {metrics.taps}</li>
              <li>Unlocks: {metrics.unlocks}</li>
              <li>CVR: {Math.round(metrics.conversionRate * 100)}%</li>
              <li>Gross: {metrics.grossRevenue.toFixed(2)}</li>
              <li>Pending: {metrics.pendingRevenue.toFixed(2)}</li>
              <li>Refunds: {metrics.refunds}</li>
              <li>Viewer rewards: {metrics.viewerRewards.toFixed(2)}</li>
              <li>Blocked attempts: {metrics.blockedAttempts}</li>
            </ul>
          </div>
        ))}
        {rows.length === 0 ? <p className="ist-mono" style={{ fontSize: 11 }}>No Magic reveals on this post.</p> : null}
      </div>
    </div>
  );
}
