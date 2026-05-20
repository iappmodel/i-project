import { useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import type { RuntimeFeedAction, RuntimeFeedState } from "../../feed/studioFeedRuntimeStore";
import { shouldEmitVerifiedView } from "../../feed/studioFeedRuntimeStore";
import type { RuntimePost, RuntimeViewerSession } from "../../feed/studioFeedTypes";
import type { MagicReveal } from "../../studioTypes";
import { StudioRuntimeWalletChip } from "./StudioRuntimeWalletChip";
import { StudioRuntimeCreatorStrip } from "./StudioRuntimeCreatorStrip";
import { StudioRuntimeDisclosures } from "./StudioRuntimeDisclosures";
import { StudioRuntimeAgeGate } from "./StudioRuntimeAgeGate";
import { StudioRuntimeActionCluster } from "./StudioRuntimeActionCluster";
import { StudioRuntimeMagicOverlay } from "./StudioRuntimeMagicOverlay";
import { StudioRuntimePostControls } from "./StudioRuntimePostControls";
import { StudioRuntimeUnlockSheet } from "./StudioRuntimeUnlockSheet";

function findActiveSession(sessions: RuntimeFeedState["viewerSessions"], postId: string): RuntimeViewerSession | undefined {
  return Object.values(sessions).find((s) => s.postId === postId && !s.endedAt);
}

function viewerAccountIdFromState(accounts: RuntimeFeedState["runtimeWalletAccounts"]): string {
  return accounts.find((a) => a.type === "viewer")?.userId ?? "user_viewer_demo";
}

export function sessionIdForPostViewer(postId: string, viewerAccountId: string): string {
  return `sess_${postId}_${viewerAccountId}`;
}

export function StudioRuntimePost({
  post,
  feedState,
  feedDispatch,
  isActive,
  creatorMode = false,
}: {
  post: RuntimePost;
  feedState: RuntimeFeedState;
  feedDispatch: Dispatch<RuntimeFeedAction>;
  isActive: boolean;
  creatorMode?: boolean;
}) {
  const viewerAccountId = useMemo(() => viewerAccountIdFromState(feedState.runtimeWalletAccounts), [feedState.runtimeWalletAccounts]);
  const sid = sessionIdForPostViewer(post.id, viewerAccountId);
  const [playheadMs, setPlayheadMs] = useState(0);
  const verifiedSent = useRef(false);
  const durationMs = post.postPackage.exportManifest?.durationMs ?? post.postPackage.timeline.durationMs ?? 32_000;
  const session = findActiveSession(feedState.viewerSessions, post.id);
  const verifiedHuman = feedState.runtimeWalletAccounts.find((a) => a.type === "viewer")?.isVerifiedHuman ?? true;

  const unlockedIds = useMemo(() => {
    const s = new Set<string>();
    for (const u of feedState.runtimeUnlocks) {
      if (u.postId === post.id && u.viewerAccountId === viewerAccountId) s.add(u.revealId);
    }
    return s;
  }, [feedState.runtimeUnlocks, post.id, viewerAccountId]);

  const activeReveals = useMemo(
    () => post.postPackage.magicReveals.filter((r) => r.status !== "deleted" && r.revealType !== "always_hidden"),
    [post.postPackage.magicReveals]
  );

  const needsAge =
    post.postPackage.runtimeConfig.requireAgeGateBeforeView ||
    post.postPackage.ageRating === "eighteen_plus" ||
    post.postPackage.ageRating === "twentyone_plus" ||
    post.postPackage.ageRating === "restricted";
  const ageOk = session?.ageGatePassed ?? false;
  const monetizationLocked = needsAge && !ageOk;

  const thumb = post.postPackage.exportManifest?.thumbnailUrl ?? "mock://thumb";
  const blockedViewer = post.status === "blocked" && !creatorMode;
  const archivedHidden = post.status === "archived" && !creatorMode;

  useEffect(() => {
    if (!isActive || blockedViewer || archivedHidden) return;
    verifiedSent.current = false;
    setPlayheadMs(0);
    feedDispatch({ type: "START_VIEWER_SESSION", postId: post.id, viewerAccountId });
    return () => {
      feedDispatch({ type: "END_VIEWER_SESSION", sessionId: sid });
    };
  }, [isActive, post.id, viewerAccountId, sid, blockedViewer, archivedHidden, feedDispatch]);

  useEffect(() => {
    if (!isActive || blockedViewer || archivedHidden) return;
    const tick = window.setInterval(() => {
      setPlayheadMs((p) => (p + 220) % Math.max(durationMs, 1));
      feedDispatch({
        type: "UPDATE_WATCH_TIME",
        sessionId: sid,
        deltaMs: 220,
        durationMs,
        verifiedHuman,
      });
    }, 220);
    return () => window.clearInterval(tick);
  }, [isActive, durationMs, verifiedHuman, sid, blockedViewer, archivedHidden, feedDispatch]);

  useEffect(() => {
    if (!session || verifiedSent.current) return;
    if (shouldEmitVerifiedView({ session, durationMs, verifiedHuman })) {
      verifiedSent.current = true;
      feedDispatch({
        type: "RECORD_VERIFIED_VIEW",
        postId: post.id,
        viewerAccountId,
        sessionId: session.id,
      });
    }
  }, [session, durationMs, verifiedHuman, post.id, viewerAccountId, feedDispatch]);

  const sheet = feedState.unlockSheet;
  const sheetReveal: MagicReveal | null =
    sheet.open && sheet.postId === post.id ? post.postPackage.magicReveals.find((r) => r.id === sheet.revealId) ?? null : null;

  if (blockedViewer) {
    return (
      <div className="ist-panel" style={{ padding: 20, textAlign: "center" }}>
        <div className="ist-display" style={{ fontSize: 14 }}>This post is blocked</div>
        <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>Creator / admin preview only in production.</p>
      </div>
    );
  }

  if (archivedHidden) {
    return (
      <div className="ist-panel" style={{ padding: 20, textAlign: "center", opacity: 0.7 }}>
        <div className="ist-display" style={{ fontSize: 14 }}>Archived</div>
        <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)" }}>Hidden from public feed; ledger preserved.</p>
      </div>
    );
  }

  return (
    <article className="ist-runtime-post" style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "rgba(15,23,42,0.92)", border: "1px solid rgba(148,163,184,0.15)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", gap: 8, flexWrap: "wrap" }}>
        <StudioRuntimeWalletChip accounts={feedState.runtimeWalletAccounts} />
        {post.viewerRewardEligible ? (
          <span className="ist-chip" style={{ fontSize: 10 }}>
            {post.viewerRewardLabel ?? "Earn reward"}
          </span>
        ) : null}
        {post.status === "under_review" ? (
          <span className="ist-mono" style={{ fontSize: 9, color: "#fcd34d" }}>Under review</span>
        ) : null}
        {post.status === "paused" ? (
          <span className="ist-mono" style={{ fontSize: 9, color: "#94a3b8" }}>Paused · prior unlocks kept</span>
        ) : null}
      </div>

      <StudioRuntimeDisclosures
        postId={post.id}
        disclosures={post.postPackage.disclosures}
        viewerAccountId={viewerAccountId}
        feedDispatch={feedDispatch}
      />

      <div style={{ position: "relative", aspectRatio: "9/16", maxHeight: 420, margin: "0 12px 12px", background: "#0f172a" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(160deg, rgba(30,41,59,0.5), rgba(15,23,42,0.95)), url(${thumb})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <StudioRuntimeAgeGate
          post={post}
          viewerAccountId={viewerAccountId}
          sessionId={session?.id ?? null}
          passed={ageOk}
          feedDispatch={feedDispatch}
          childrenWhenPassed={
            <>
              {activeReveals.map((r) => (
                <StudioRuntimeMagicOverlay
                  key={r.id}
                  post={post}
                  reveal={r}
                  playheadMs={playheadMs}
                  session={session ?? null}
                  unlockedIds={unlockedIds}
                  viewerAccountId={viewerAccountId}
                  feedDispatch={feedDispatch}
                  onTap={(res) => {
                    if (res.shouldOpenUnlockSheet) {
                      feedDispatch({ type: "SET_UNLOCK_SHEET", sheet: { open: true, postId: post.id, revealId: r.id } });
                    } else if (res.blockedReason || res.requiredAction) {
                      feedDispatch({
                        type: "SET_UNLOCK_SHEET",
                        sheet: {
                          open: true,
                          postId: post.id,
                          revealId: r.id,
                          blockedReason: res.blockedReason ?? String(res.requiredAction ?? "Unavailable"),
                        },
                      });
                    }
                  }}
                />
              ))}
            </>
          }
        />
        <div style={{ position: "absolute", bottom: 8, left: 10, right: 10, zIndex: 8 }}>
          <StudioRuntimeCreatorStrip post={post} />
        </div>
      </div>

      <div style={{ padding: "0 14px 14px" }}>
        <p style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.4 }}>{post.caption}</p>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: 0 }}>
          {post.hashtags.join(" ")}
        </p>
        <StudioRuntimeActionCluster
          post={post}
          viewerAccountId={viewerAccountId}
          metrics={post.metrics}
          feedDispatch={feedDispatch}
          disableMonetary={monetizationLocked}
        />
        {creatorMode ? <StudioRuntimePostControls post={post} unlocks={feedState.runtimeUnlocks} feedDispatch={feedDispatch} /> : null}
      </div>

      {sheet.open && sheet.postId === post.id ? (
        <StudioRuntimeUnlockSheet
          post={post}
          reveal={sheetReveal}
          blockedReason={sheet.blockedReason}
          viewerAccountId={viewerAccountId}
          feedDispatch={feedDispatch}
        />
      ) : null}
    </article>
  );
}
