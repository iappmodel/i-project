import type { StudioController } from "../../studioStore";

export function CampaignRuntimeCTA({ studio }: { studio: StudioController }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      <button type="button" className="ist-btn ist-btn--primary" onClick={() => studio.actions.completeCampaignActionMock()}>
        Run campaign action verification
      </button>
      <button
        type="button"
        className="ist-btn ist-btn--ghost"
        onClick={() => studio.actions.createPopsChallenge("active_tap", undefined, `cmp_${studio.state.studioSimPost.postId}`)}
      >
        Require POPS
      </button>
    </div>
  );
}
