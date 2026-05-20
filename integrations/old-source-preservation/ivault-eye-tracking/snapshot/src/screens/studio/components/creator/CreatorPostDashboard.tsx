import { useMemo, useState } from "react";
import type { StudioController } from "../../studioStore";
import { useRuntimeFeed } from "../../feed/RuntimeFeedContext";
import { MOCK_CREATOR_USER_ID } from "../../feed/studioFeedMockData";
import { calculateCreatorPostSummary } from "../../feed/studioFeedAnalytics";
import { CreatorPostAnalytics } from "./CreatorPostAnalytics";
import { CreatorMagicRevealAnalytics } from "./CreatorMagicRevealAnalytics";
import { CreatorEarningsBreakdown } from "./CreatorEarningsBreakdown";
import { CreatorPostLifecyclePanel } from "./CreatorPostLifecyclePanel";

type Tab = "overview" | "magic" | "earnings" | "audience" | "lifecycle";

export function CreatorPostDashboard({ studio: _studio }: { studio: StudioController }) {
  const studio = _studio;
  const { feedState, feedDispatch } = useRuntimeFeed();
  const [tab, setTab] = useState<Tab>("overview");

  const selectedId = feedState.creatorDashboard.selectedPostId ?? feedState.selectedPostId ?? feedState.activePostId;
  const post = useMemo(() => {
    const mine = feedState.posts.filter((p) => p.creatorUserId === MOCK_CREATOR_USER_ID);
    const pick = selectedId ? feedState.posts.find((p) => p.id === selectedId) : mine[0];
    return pick ?? feedState.posts[0];
  }, [feedState.posts, feedState.creatorDashboard.selectedPostId, feedState.selectedPostId, feedState.activePostId, selectedId]);

  const mine = useMemo(() => feedState.posts.filter((p) => p.creatorUserId === MOCK_CREATOR_USER_ID), [feedState.posts]);
  const summary = useMemo(
    () => calculateCreatorPostSummary(feedState.posts, feedState.runtimeLedgerEntries, MOCK_CREATOR_USER_ID),
    [feedState.posts, feedState.runtimeLedgerEntries]
  );

  if (!post) {
    return <p className="ist-mono" style={{ fontSize: 11 }}>No posts for creator dashboard.</p>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "magic", label: "Magic" },
    { id: "earnings", label: "Earnings" },
    { id: "audience", label: "Audience" },
    { id: "lifecycle", label: "Lifecycle" },
  ];

  return (
    <div className="ist-scroll" style={{ maxHeight: "min(72vh, 680px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <h3 className="ist-panel__title" style={{ margin: 0 }}>
          Creator dashboard
        </h3>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => feedDispatch({ type: "CLOSE_CREATOR_DASHBOARD" })}>
          Close
        </button>
      </div>

      <div className="ist-field" style={{ marginBottom: 12 }}>
        <label className="ist-label">Post</label>
        <select
          className="ist-select"
          value={post.id}
          onChange={(e) =>
            feedDispatch({
              type: "OPEN_CREATOR_DASHBOARD",
              postId: e.target.value,
            })
          }
        >
          {mine.map((p) => (
            <option key={p.id} value={p.id}>
              {p.caption.slice(0, 40)}… · {p.status}
            </option>
          ))}
        </select>
      </div>

      <div className="ist-segmented" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "ist-segmented--active" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div>
          <div className="ist-panel" style={{ padding: 12, marginBottom: 12 }}>
            <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
              Stage 7 verification stats (local simulation)
            </div>
            <div className="ist-grid2" style={{ marginTop: 8 }}>
              <div className="ist-mono" style={{ fontSize: 10 }}>
                verification pass rate
                <br />
                <strong>
                  {(() => {
                    const mine = studio.state.verificationRecords.filter((r) => r.creatorAccountId === MOCK_CREATOR_USER_ID);
                    const passed = mine.filter((r) => r.status === "passed").length;
                    return mine.length ? `${Math.round((passed / mine.length) * 100)}%` : "—";
                  })()}
                </strong>
              </div>
              <div className="ist-mono" style={{ fontSize: 10 }}>
                dispute rate
                <br />
                <strong>{studio.state.disputes.filter((d) => d.creatorAccountId === MOCK_CREATOR_USER_ID).length}</strong>
              </div>
              <div className="ist-mono" style={{ fontSize: 10 }}>
                fraud rejected count
                <br />
                <strong>{studio.state.events.filter((e) => e.type === "fraud.action_rejected").length}</strong>
              </div>
              <div className="ist-mono" style={{ fontSize: 10 }}>
                settlement holds
                <br />
                <strong>{studio.state.unlocks.filter((u) => u.settlementStatus === "held" || u.settlementStatus === "pending").length}</strong>
              </div>
            </div>
          </div>
          <div className="ist-panel" style={{ padding: 12, marginBottom: 12 }}>
            <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
              Status · {post.status} · Visibility · {post.visibility} · Published · {post.publishedAt ?? "—"}
            </div>
            <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginTop: 6 }}>
              Safety · {post.postPackage.safetyReport?.status ?? "—"} · Rights · {post.postPackage.rightsReport?.status ?? "—"}
            </div>
            <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", marginTop: 6 }}>
              Monetization · {post.postPackage.monetizationMode}
            </div>
          </div>
          <div className="ist-grid2" style={{ marginBottom: 12 }}>
            {[
              ["Total posts", summary.totalPosts],
              ["Published", summary.publishedPosts],
              ["Views", summary.totalViews],
              ["Verified", summary.verifiedViews],
              ["Unlocks", summary.totalUnlocks],
              [
                "Top post",
                summary.topEarningPost ? `${summary.topEarningPost.postId.slice(0, 12)}… (${summary.topEarningPost.earnings.toFixed(0)})` : "—",
              ],
            ].map(([k, v]) => (
              <div key={String(k)} className="ist-panel" style={{ padding: 8 }}>
                <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>{k}</div>
                <div className="ist-display" style={{ fontSize: 13 }}>{String(v)}</div>
              </div>
            ))}
          </div>
          <CreatorPostAnalytics post={post} />
        </div>
      ) : null}

      {tab === "magic" ? (
        <CreatorMagicRevealAnalytics post={post} events={feedState.actionEvents} unlocks={feedState.runtimeUnlocks} ledger={feedState.runtimeLedgerEntries} />
      ) : null}

      {tab === "earnings" ? <CreatorEarningsBreakdown posts={mine} ledger={feedState.runtimeLedgerEntries} /> : null}

      {tab === "audience" ? (
        <div className="ist-panel" style={{ padding: 12 }}>
          <div className="ist-display" style={{ fontSize: 12, marginBottom: 8 }}>Audience (mock)</div>
          <p className="ist-mono" style={{ fontSize: 10, margin: 0 }}>
            No real social graph or recommendations — placeholder for Stage 6+. Current session events: {feedState.actionEvents.filter((e) => e.postId === post.id).length}.
          </p>
        </div>
      ) : null}

      {tab === "lifecycle" ? <CreatorPostLifecyclePanel post={post} unlocks={feedState.runtimeUnlocks} feedDispatch={feedDispatch} /> : null}
    </div>
  );
}
