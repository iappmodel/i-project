import type { StudioController } from "../studioStore";
import { CampaignRuntimeCTA } from "../components/campaign/CampaignRuntimeCTA";
import { CampaignOwnerDashboard } from "../components/campaign/CampaignOwnerDashboard";

/** Stage 6 surface: monetization + brand/creator loops; persistence via Backend tool (mock). */
export function CampaignBuilderPanel({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const m = project.monetization;

  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">Campaign builder</h3>
      <p style={{ fontSize: 11, color: "var(--ist-muted)", marginTop: 0 }}>
        Configure monetization locally. Server authority applies to activation, verification, and payouts — see Backend → Authority.
      </p>
      <div className="ist-field">
        <span className="ist-label">Post kind</span>
        <div className="ist-mono" style={{ fontSize: 11 }}>
          {m.postKind}
        </div>
      </div>
      <div className="ist-field" style={{ marginTop: 10 }}>
        <span className="ist-label">Earning flags (summary)</span>
        <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
          {JSON.stringify(
            {
              viewerEarnsOnWatch: m.viewerEarnsOnWatch,
              viewerEarnsOnComplete: m.viewerEarnsOnComplete,
              viewerEarnsOnUnlock: m.viewerEarnsOnUnlock,
              creatorEarnsPerVerifiedView: m.creatorEarnsPerVerifiedView,
              creatorEarnsPerUnlock: m.creatorEarnsPerUnlock,
              brandPaysPerVerifiedAction: m.brandPaysPerVerifiedAction,
            },
            null,
            2
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.setActiveTool("monetize")}>
          Open Monetize
        </button>
        <button type="button" className="ist-btn ist-btn--primary" style={{ fontSize: 10 }} onClick={() => void actions.persistCampaignToMock()}>
          Persist campaign (mock)
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.setActiveTool("backend")}>
          Backend readiness
        </button>
      </div>
      <CampaignRuntimeCTA studio={studio} />
      <CampaignOwnerDashboard studio={studio} />
    </div>
  );
}
