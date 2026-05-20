import type { RuntimePost } from "../../feed/studioFeedTypes";

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginBottom: 2 }}>
        {label} · {value}
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: "linear-gradient(90deg,#5eead4,#818cf8)" }} />
      </div>
    </div>
  );
}

export function CreatorPostAnalytics({ post }: { post: RuntimePost }) {
  const m = post.metrics;
  const max = Math.max(
    1,
    m.impressions,
    m.views,
    m.verifiedViews,
    m.likes,
    m.saves,
    m.shares,
    m.magicTaps,
    m.magicUnlocks
  );
  const verifiedRate = m.views > 0 ? Math.round((m.verifiedViews / m.views) * 100) : 0;

  return (
    <div>
      <div className="ist-display" style={{ fontSize: 12, marginBottom: 10 }}>Post analytics</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          ["Impressions", m.impressions],
          ["Views", m.views],
          ["Verified views", m.verifiedViews],
          ["Avg watch (ms)", m.averageWatchMs],
          ["Completion", Math.round(m.completionRate * 100) + "%"],
          ["Likes", m.likes],
          ["Saves", m.saves],
          ["Shares", m.shares],
          ["Follows", m.follows],
          ["Tips", m.tips],
          ["Magic taps", m.magicTaps],
          ["Magic unlocks", m.magicUnlocks],
          ["Unlock CVR", Math.round(m.unlockConversionRate * 100) + "%"],
        ].map(([k, v]) => (
          <div key={String(k)} className="ist-panel" style={{ padding: 8 }}>
            <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>{k}</div>
            <div className="ist-display" style={{ fontSize: 14 }}>{String(v)}</div>
          </div>
        ))}
      </div>
      <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginBottom: 6 }}>
        Distribution (mock bars)
      </div>
      <Bar label="Views" value={m.views} max={max} />
      <Bar label="Verified" value={m.verifiedViews} max={max} />
      <Bar label="Magic taps" value={m.magicTaps} max={max} />
      <Bar label="Unlocks" value={m.magicUnlocks} max={max} />
      <div className="ist-panel" style={{ marginTop: 12, padding: 10 }}>
        <div className="ist-display" style={{ fontSize: 11, marginBottom: 6 }}>Attention quality (mock)</div>
        <p className="ist-mono" style={{ fontSize: 10, margin: 0 }}>
          Verified view rate: {verifiedRate}% · Avg attention score: ~{Math.min(100, 58 + Math.round(m.completionRate * 20))} · Suspicious sessions (mock): 0
        </p>
      </div>
    </div>
  );
}
