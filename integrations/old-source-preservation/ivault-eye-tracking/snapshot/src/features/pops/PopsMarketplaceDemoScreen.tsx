import { useEffect, type CSSProperties } from "react";
import { popsTokens } from "../../design/pops/pops-tokens";
import { FeedPopsMockedDemoFeed } from "../feed/pops/useFeedPopsMoment";
import { EarnOfferProofCard } from "../earn/pops/EarnOfferProofCard";
import { EarnOfferVerificationSteps } from "../earn/pops/EarnOfferVerificationSteps";
import { EarnPopsCompletionScreen } from "../earn/pops/EarnPopsCompletionScreen";
import { createEarnOfferPopsDemoData, useEarnOfferPops } from "../earn/pops/useEarnOfferPops";

export function PopsMarketplaceDemoScreen() {
  const demo = createEarnOfferPopsDemoData();
  const pops = useEarnOfferPops({
    campaign: demo.campaign,
    userContext: demo.userContext,
    checkpoints: demo.checkpoints,
    completionState: null
  });

  useEffect(() => {
    if (!pops.runtime.sessionStarted) return;
    if (pops.completionState !== null) return;
    const timer = setInterval(() => {
      pops.actions.captureProgress(11);
    }, 1_000);
    return () => clearInterval(timer);
  }, [pops.runtime.sessionStarted, pops.completionState, pops.actions]);

  useEffect(() => {
    if (pops.runtime.progressPct < 96) return;
    if (pops.completionState !== null) return;
    pops.actions.completeOffer("APPROVED_FULL");
  }, [pops.runtime.progressPct, pops.completionState, pops.actions]);

  return (
    <section style={shellStyle}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0, color: popsTokens.color.text.primary }}>P.O.P.S marketplace demo</h2>
        <p style={{ margin: 0, color: popsTokens.color.text.secondary }}>
          Feed and Earn integration using the same verification language.
        </p>
      </header>

      <div style={columnStyle}>
        <h3 style={titleStyle}>Feed sponsored moment</h3>
        <FeedPopsMockedDemoFeed />
      </div>

      <div style={columnStyle}>
        <h3 style={titleStyle}>Earn offer</h3>
        <EarnOfferProofCard pops={pops} />
        <EarnOfferVerificationSteps steps={pops.verificationSteps} />

        <div style={buttonRowStyle}>
          <button disabled={!pops.canStart} onClick={pops.actions.startOffer}>
            Start offer
          </button>
          <button disabled={!pops.runtime.sessionStarted || pops.completionState !== null} onClick={() => pops.actions.captureProgress(18)}>
            Capture progress
          </button>
          <button disabled={!pops.runtime.sessionStarted || pops.completionState !== null} onClick={() => pops.actions.completeOffer("PENDING_REVIEW")}>
            Send to review
          </button>
          <button onClick={pops.actions.resetOffer}>Reset</button>
        </div>

        <div style={metricsStyle}>
          <span>Progress</span>
          <span>{Math.round(pops.runtime.progressPct)}%</span>
          <span>{pops.runtime.taskProgressLabel}</span>
        </div>

        {pops.completionState ? <EarnPopsCompletionScreen state={pops.completionState} /> : null}
      </div>
    </section>
  );
}

const shellStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 16,
  background: popsTokens.color.surface.base,
  border: `1px solid ${popsTokens.color.border.subtle}`,
  borderRadius: popsTokens.radius.lg,
  maxWidth: 760
};

const headerStyle: CSSProperties = {
  display: "grid",
  gap: 4
};

const columnStyle: CSSProperties = {
  display: "grid",
  gap: 10
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: popsTokens.color.text.primary
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8
};

const metricsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, auto))",
  gap: 10,
  alignItems: "center",
  color: popsTokens.color.text.secondary,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
  fontSize: 12
};
