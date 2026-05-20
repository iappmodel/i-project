import { useEffect } from "react";
import type { StudioTool } from "../studioTypes";
import type { StudioController } from "../studioStore";
import { TrimPanel } from "../panels/TrimPanel";
import { FiltersPanel } from "../panels/FiltersPanel";
import { BeautyPanel } from "../panels/BeautyPanel";
import { AudioPanel } from "../panels/AudioPanel";
import { TextPanel } from "../panels/TextPanel";
import { StickersPanel } from "../panels/StickersPanel";
import { SpeedPanel } from "../panels/SpeedPanel";
import { CaptionsPanel } from "../panels/CaptionsPanel";
import { ExportPanel } from "../panels/ExportPanel";
import { MagicPanel } from "../panels/MagicPanel";
import { BlurCAFPanel } from "../panels/BlurCAFPanel";
import { MonetizePanel } from "../panels/MonetizePanel";
import { RightsSafetyPanel } from "../panels/RightsSafetyPanel";
import { PlaceholderToolPanel } from "../panels/PlaceholderToolPanel";
import { StudioPublishPanel } from "./StudioPublishPanel";
import { BackendReadinessPanel } from "./backend/BackendReadinessPanel";
import { CampaignBuilderPanel } from "../panels/CampaignBuilderPanel";
import { VerificationPanel } from "../panels/VerificationPanel";
import { StudioRuntimeFeed } from "./runtime/StudioRuntimeFeed";
import { CreatorPostDashboard } from "./creator/CreatorPostDashboard";
import { useRuntimeFeed } from "../feed/RuntimeFeedContext";

function panelTitle(tool: StudioTool): string {
  switch (tool) {
    case "trim":
      return "Trim";
    case "filters":
      return "Filters";
    case "beauty":
      return "Beauty";
    case "effects":
      return "Effects";
    case "blur_caf":
      return "Blur / CAF";
    case "audio":
      return "Audio";
    case "text":
      return "Text";
    case "stickers":
      return "Stickers";
    case "speed":
      return "Speed";
    case "captions":
      return "Captions";
    case "magic":
      return "Reveal Studio";
    case "campaign":
      return "Campaign builder";
    case "verify":
      return "Verification";
    case "monetize":
      return "Monetize";
    case "rights_safety":
      return "Rights & Safety";
    case "backend":
      return "Backend Readiness";
    case "export":
      return "Export";
    case "publish":
      return "Publish";
    case "runtime_feed":
      return "Runtime feed";
    case "creator_dashboard":
      return "Creator dashboard";
    default:
      return "Inspector";
  }
}

export function StudioInspector({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const { actions } = studio;
  const tool = project.activeTool;
  const { feedDispatch } = useRuntimeFeed();

  useEffect(() => {
    if (tool === "creator_dashboard") {
      feedDispatch({ type: "OPEN_CREATOR_DASHBOARD", postId: null });
    }
  }, [tool, feedDispatch]);

  const body = (() => {
    switch (tool) {
      case "trim":
        return <TrimPanel studio={studio} />;
      case "filters":
        return <FiltersPanel studio={studio} />;
      case "beauty":
        return <BeautyPanel studio={studio} />;
      case "audio":
        return <AudioPanel studio={studio} />;
      case "text":
        return <TextPanel studio={studio} />;
      case "stickers":
        return <StickersPanel studio={studio} />;
      case "speed":
        return <SpeedPanel studio={studio} />;
      case "captions":
        return <CaptionsPanel studio={studio} />;
      case "effects":
        return <PlaceholderToolPanel title="Effects" body="Transitions, glow, glitch — mock pipeline hooks land here." />;
      case "blur_caf":
        return <BlurCAFPanel studio={studio} />;
      case "magic":
        return <MagicPanel studio={studio} />;
      case "campaign":
        return <CampaignBuilderPanel studio={studio} />;
      case "verify":
        return <VerificationPanel studio={studio} />;
      case "monetize":
        return <MonetizePanel studio={studio} />;
      case "rights_safety":
        return <RightsSafetyPanel studio={studio} />;
      case "backend":
        return <BackendReadinessPanel studio={studio} />;
      case "export":
        return <ExportPanel studio={studio} />;
      case "publish":
        return <StudioPublishPanel studio={studio} />;
      case "runtime_feed":
        return <StudioRuntimeFeed />;
      case "creator_dashboard":
        return <CreatorPostDashboard studio={studio} />;
      default:
        return <PlaceholderToolPanel title={panelTitle(tool)} body="This tool is not wired in Stage 1." />;
    }
  })();

  return (
    <aside className="ist-studio-inspector" aria-label="Inspector">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
        <span className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)" }}>
          Active · {panelTitle(tool)}
        </span>
        <button type="button" className="ist-btn ist-btn--ghost" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => actions.setInspectorOpen(false)} title="Hide inspector">
          Hide
        </button>
      </div>
      {tool === "magic" ? (
        <div className="ist-mono" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.openUnlockSimulator()}>
            Simulate unlock
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.openWalletPanel()}>
            Wallet
          </button>
          <button type="button" className="ist-btn ist-btn--ghost" style={{ fontSize: 10 }} onClick={() => actions.setSettlementSummaryOpen(true)}>
            Ledger
          </button>
        </div>
      ) : null}
      {body}
    </aside>
  );
}
