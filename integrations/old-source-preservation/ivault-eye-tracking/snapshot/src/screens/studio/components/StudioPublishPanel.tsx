import { useEffect, useMemo, useState } from "react";
import type { StudioController } from "../studioStore";
import { defaultPublishWalletState } from "../publish/studioPublishEngine";
import { validateStudioProjectForPublish } from "../publish/studioPublishValidator";
import type { PostMonetizationMode, PostVisibility, PublishTarget } from "../publish/studioPublishTypes";
import { RUNTIME_STUDIO_SLOT_ID } from "../feed/studioFeedMockData";
import { useRuntimeFeed } from "../feed/RuntimeFeedContext";
import { StudioPublishChecklist } from "./StudioPublishChecklist";
import { StudioPublishSummary } from "./StudioPublishSummary";
import { StudioDisclosurePanel } from "./StudioDisclosurePanel";

const PUBLISH_TARGETS: { value: PublishTarget; label: string }[] = [
  { value: "i_feed", label: "[ i ] Feed" },
  { value: "i_story", label: "[ i ] Story" },
  { value: "i_campaign", label: "Campaign" },
  { value: "private_link", label: "Private link" },
  { value: "subscriber_only", label: "Subscribers only" },
  { value: "draft_only", label: "Draft only" },
  { value: "download_only", label: "Download only" },
  { value: "external_platform", label: "External" },
];

const VISIBILITY_OPTS: { value: PostVisibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "subscribers", label: "Subscribers" },
  { value: "private", label: "Private" },
  { value: "unlisted", label: "Unlisted" },
  { value: "campaign_only", label: "Campaign only" },
];

const MONETIZATION_OPTS: { value: PostMonetizationMode; label: string }[] = [
  { value: "none", label: "None" },
  { value: "tips_enabled", label: "Tips" },
  { value: "magic_unlocks", label: "Magic unlocks" },
  { value: "sponsor_funded", label: "Sponsor funded" },
  { value: "paid_post", label: "Paid post" },
  { value: "subscriber_only", label: "Subscriber only" },
  { value: "campaign_rewarded", label: "Campaign rewarded" },
];

function hashtagString(tags: string[]): string {
  return tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
}

function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith("#") ? s.slice(1) : s));
}

export function StudioPublishPanel({ studio }: { studio: StudioController }) {
  const { project, walletAccounts } = studio.state;
  const { actions } = studio;
  const { feedDispatch } = useRuntimeFeed();
  const [tagInput, setTagInput] = useState(() => hashtagString(project.hashtags));

  useEffect(() => {
    setTagInput(hashtagString(project.hashtags));
  }, [project.id, project.hashtags]);

  const validation = useMemo(
    () =>
      validateStudioProjectForPublish(project, defaultPublishWalletState(), {
        rights: project.rightsReport,
        safety: project.safetyReport,
        disclosures: project.disclosures,
      }),
    [project]
  );

  const checks = project.publishChecks.length > 0 ? project.publishChecks : validation.checks;
  const canPublish = validation.canPublish;
  const canExport = validation.canExport;
  const exp = project.exportSettings;
  const hasMedia = project.assets.some((a) => a.type === "video" || a.type === "image");
  const exportBusy = exp.status === "exporting";
  const hasManifest = Boolean(project.exportManifest);
  const published = project.publishStatus === "published" && Boolean(project.publishedPost);

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Publish</h3>
      <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 14px" }}>
        Local simulation only — no uploads, moderation APIs, or payouts. Creator revenue remains pending settlement until verified (mock).
      </p>

      {published ? (
        <div className="ist-panel" style={{ marginBottom: 14, padding: 12, borderColor: "rgba(52,211,153,0.35)" }}>
          <div className="ist-display" style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
            Published (mock)
          </div>
          <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 12px" }}>
            Post {project.publishedPost?.id ?? "—"} · package {project.postPackage?.id ?? "—"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="ist-btn ist-btn--primary"
              onClick={() => {
                feedDispatch({ type: "SET_ACTIVE_POST", postId: RUNTIME_STUDIO_SLOT_ID });
                actions.setActiveTool("runtime_feed");
              }}
            >
              Open runtime feed
            </button>
            <button
              type="button"
              className="ist-btn ist-btn--ghost"
              onClick={() => {
                feedDispatch({ type: "OPEN_CREATOR_DASHBOARD", postId: RUNTIME_STUDIO_SLOT_ID });
                actions.setActiveTool("creator_dashboard");
              }}
            >
              Creator dashboard
            </button>
            <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.openRuntimePreview()}>
              Runtime preview (package)
            </button>
          </div>
        </div>
      ) : null}

      <section className="ist-panel" style={{ marginBottom: 14, padding: 12 }}>
        <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
          A. Post setup
        </div>
        <div className="ist-field">
          <label className="ist-label">Caption</label>
          <textarea
            className="ist-input"
            rows={3}
            value={project.caption}
            onChange={(e) => actions.setPostCaption(e.target.value)}
            placeholder="Caption shown in feed…"
          />
        </div>
        <div className="ist-field">
          <label className="ist-label">Hashtags</label>
          <input
            className="ist-input"
            value={tagInput}
            onChange={(e) => {
              setTagInput(e.target.value);
              actions.setPostHashtags(parseHashtags(e.target.value));
            }}
            placeholder="#music #live"
          />
        </div>
        <div className="ist-grid2">
          <div className="ist-field">
            <label className="ist-label">Visibility</label>
            <select
              className="ist-select"
              value={project.visibility}
              onChange={(e) => actions.setPostVisibility(e.target.value as PostVisibility)}
            >
              {VISIBILITY_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ist-field">
            <label className="ist-label">Publish target</label>
            <select
              className="ist-select"
              value={project.publishTarget}
              onChange={(e) => actions.setPublishTarget(e.target.value as PublishTarget)}
            >
              {PUBLISH_TARGETS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="ist-field">
          <label className="ist-label">Monetization</label>
          <select
            className="ist-select"
            value={project.monetizationMode}
            onChange={(e) => actions.setMonetizationMode(e.target.value as PostMonetizationMode)}
          >
            {MONETIZATION_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section style={{ marginBottom: 14 }}>
        <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
          B. Checklist
        </div>
        <StudioPublishChecklist checks={checks} />
      </section>

      <section className="ist-panel" style={{ marginBottom: 14, padding: 12 }}>
        <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
          C. Scans & validation
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="ist-btn" onClick={() => actions.runSafetyScan()}>
            Run safety scan
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.runRightsScan()}>
            Run rights scan
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.runPublishValidation()}>
            Validate publish
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.openSafetyReportPanel()}>
            View safety report
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" onClick={() => actions.openRightsReportPanel()}>
            View rights report
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 14 }}>
        <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
          D. Disclosures
        </div>
        <StudioDisclosurePanel studio={studio} />
      </section>

      <section className="ist-panel" style={{ marginBottom: 14, padding: 12 }}>
        <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 10 }}>
          E. Export & publish
        </div>
        <p className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", margin: "0 0 10px" }}>
          Export uses mock manifest. Build package snapshots media + Magic + wallet rules. Runtime preview uses the package, not live project edits.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className="ist-btn"
            disabled={exportBusy || !hasMedia || !canExport}
            title={!hasMedia ? "Add video or image" : !canExport ? "Resolve export-blocking checks (see checklist)" : undefined}
            onClick={() => actions.startExport()}
          >
            Start export
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" disabled={!hasManifest} onClick={() => actions.buildPostPackage()}>
            Build post package
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" disabled={!project.postPackage} onClick={() => actions.openRuntimePreview()}>
            Open runtime preview
          </button>
          <button type="button" className="ist-btn ist-btn--primary" disabled={!canPublish || published} onClick={() => actions.publishProject()}>
            Publish
          </button>
        </div>
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 10 }}>
          Wallet accounts: {walletAccounts.length} (mock). Pending settlement copy is enforced in disclosures.
        </p>
        <p className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)", marginTop: 6 }}>
          Signed publish packages and idempotent mutations are modeled under Backend Readiness (Stage 8).
        </p>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ marginTop: 8 }} onClick={() => actions.setActiveTool("backend")}>
          Backend Readiness
        </button>
      </section>

      <StudioPublishSummary studio={studio} />
    </div>
  );
}
