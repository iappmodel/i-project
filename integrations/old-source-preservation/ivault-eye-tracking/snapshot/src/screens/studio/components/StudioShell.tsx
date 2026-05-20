import type { StudioController } from "../studioStore";
import { UnlockSimulationPanel } from "../panels/UnlockSimulationPanel";
import { StudioSettlementSummary } from "./StudioSettlementSummary";
import { StudioWalletPanel } from "./StudioWalletPanel";
import { StudioTopBar } from "./StudioTopBar";
import { StudioLayerRail } from "./StudioLayerRail";
import { StudioPreview } from "./StudioPreview";
import { StudioInspector } from "./StudioInspector";
import { StudioTimeline } from "./StudioTimeline";
import { StudioToolRail } from "./StudioToolRail";
import { StudioFeedPublishBridge } from "../feed/StudioFeedPublishBridge";
import { StudioPostRuntimePreview } from "./StudioPostRuntimePreview";
import { StudioSafetyReportPanel } from "./StudioSafetyReportPanel";
import { StudioRightsReportPanel } from "./StudioRightsReportPanel";

export type StudioShellProps = {
  studio: StudioController;
  onBack?: () => void;
};

export function StudioShell({ studio, onBack }: StudioShellProps) {
  return (
    <>
      <StudioFeedPublishBridge studio={studio} />
      <StudioTopBar studio={studio} onBack={onBack} />
      <div className="ist-studio-main">
        <StudioLayerRail studio={studio} />
        <StudioPreview studio={studio} />
        {studio.state.inspectorOpen ? <StudioInspector studio={studio} /> : null}
      </div>
      <div className="ist-studio-timeline-wrap">
        <StudioTimeline studio={studio} />
      </div>
      <div className="ist-studio-tool-rail-wrap">
        <StudioToolRail studio={studio} />
      </div>
      <UnlockSimulationPanel studio={studio} />
      <StudioWalletPanel studio={studio} />
      <StudioSettlementSummary studio={studio} />
      {studio.state.runtimePreviewOpen && studio.state.runtimePreviewPackage ? (
        <StudioPostRuntimePreview studio={studio} pkg={studio.state.runtimePreviewPackage} onClose={() => studio.actions.closeRuntimePreview()} />
      ) : null}
      {studio.state.safetyReportPanelOpen ? (
        <StudioSafetyReportPanel studio={studio} onClose={() => studio.actions.closeSafetyReportPanel()} />
      ) : null}
      {studio.state.rightsReportPanelOpen ? (
        <StudioRightsReportPanel studio={studio} onClose={() => studio.actions.closeRightsReportPanel()} />
      ) : null}
    </>
  );
}
