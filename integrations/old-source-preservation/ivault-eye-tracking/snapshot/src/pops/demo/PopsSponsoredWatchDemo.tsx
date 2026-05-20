import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePopsSession } from "../hooks/usePopsSession";
import { PopsMomentVerified } from "../ui/PopsMomentVerified";
import { PopsPrivacyReceiptCard } from "../ui/PopsPrivacyReceiptCard";
import { PopsRewardProgress } from "../ui/PopsRewardProgress";
import { PopsStatusChip, type PopsStatusChipVariant } from "../ui/PopsStatusChip";
import { POPS_SPONSORED_WATCH_OFFER_LINE } from "../constants/pops.constants";
import { PopsProofLevelBadge } from "../ui/PopsProofLevelBadge";
import { PopsDemoRewardLedger } from "./PopsDemoRewardLedger";
import { usePopsDemoLedger } from "./usePopsDemoLedger";
import { POPS_DEMO_SCENARIOS } from "./pops-demo-scenarios";
import { PopsDemoDebugPanel } from "./PopsDemoDebugPanel";

function btn(disabled?: boolean): React.CSSProperties {
  return {
    borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.35)",
    background: disabled ? "#1e293b" : "#0f172a",
    color: disabled ? "#475569" : "#e2e8f0",
    padding: "8px 12px",
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function chipVariant(p: ReturnType<typeof usePopsSession>): PopsStatusChipVariant {
  if (!p.session) return "idle";
  const st = p.rewardDecision?.decisionStatus;
  if (st === "APPROVED_FULL" || st === "APPROVED_PARTIAL") return "verified";
  if (st === "HELD") return "held";
  if (st === "DENIED_FRAUD_RISK" || st === "DENIED_LOW_CONFIDENCE") return "denied";
  if (p.isBackgrounded) return "degraded";
  if (p.isPaused) return "pending";
  if (p.isRunning) return "active";
  return "idle";
}

export function PopsSponsoredWatchDemo() {
  const [persistLocal, setPersistLocal] = useState(true);
  const pops = usePopsSession({ persistLocal });
  const ledger = usePopsDemoLedger();
  const lastLedgerSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const sid = pops.rewardDecision?.sessionId;
    if (!sid || !pops.rewardDecision) return;
    if (lastLedgerSessionRef.current === sid) return;
    lastLedgerSessionRef.current = sid;
    ledger.addEntry({ rewardDecision: pops.rewardDecision, walletIntent: pops.walletIntent });
  }, [ledger, pops.rewardDecision, pops.walletIntent]);

  const expectedReward = useMemo(
    () => pops.session?.expectedReward ?? { coinType: "iCoin", amount: 0.25 },
    [pops.session],
  );

  const proofLevel = pops.session?.proofLevel ?? "LEVEL_2_ATTENTION";

  const fmtMs = (ms: number) => `${Math.floor(ms / 1000)}s`;

  return (
    <div
      style={{
        minHeight: "100%",
        background: "#020617",
        color: "#e2e8f0",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          border: "1px solid rgba(148,163,184,0.2)",
          borderRadius: 20,
          padding: 20,
          background: "linear-gradient(180deg,#0f172a 0%,#020617 100%)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        <header style={{ marginBottom: 16 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 22, letterSpacing: "-0.02em" }}>P.O.P.S</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Proof Of Presence System</p>
          <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.5, color: "#cbd5e1" }}>
            P.O.P.S validates the humane factor integrated on the moment.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#64748b" }}>P.O.P.S validates. Wallet settles.</p>
        </header>

        {pops.recoveryNotice ? (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              background: "rgba(34,211,238,0.12)",
              border: "1px solid rgba(34,211,238,0.35)",
              fontSize: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span>{pops.recoveryNotice}</span>
            <button type="button" style={{ ...btn(), fontSize: 11 }} onClick={pops.dismissRecoveryNotice}>
              OK
            </button>
          </div>
        ) : null}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
          <input type="checkbox" checked={persistLocal} onChange={(e) => setPersistLocal(e.target.checked)} />
          Remember session on this device (2h, demo only)
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, fontSize: 12, color: "#94a3b8" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={pops.autoRun} onChange={(e) => pops.setAutoRun(e.target.checked)} />
            Auto-run progress
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={pops.autoComplete} onChange={(e) => pops.setAutoComplete(e.target.checked)} />
            Auto-complete at 100%
          </label>
        </div>

        <section
          style={{
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            background: "rgba(15,23,42,0.9)",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 15 }}>Sponsored Watch</h2>
          <PopsProofLevelBadge proofLevel={proofLevel} showDescription size="sm" />
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            <li>{POPS_SPONSORED_WATCH_OFFER_LINE}</li>
            <li>Proof: Verified Attention</li>
            <li>No raw camera or audio.</li>
          </ul>
          <button type="button" style={{ ...btn(false), marginTop: 12, width: "100%" }} onClick={pops.startSponsoredWatch}>
            Start sponsored watch
          </button>
        </section>

        {pops.session && !pops.isCompleted ? (
          <section style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                height: 120,
                borderRadius: 12,
                background: "#1e293b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                color: "#64748b",
              }}
            >
              Content placeholder
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Progress: <strong style={{ color: "#e2e8f0" }}>{pops.progressPct}%</strong> · Elapsed {fmtMs(pops.elapsedMs)}
              {pops.preview ? (
                <>
                  {" "}
                  · Preview gate <strong style={{ color: "#e2e8f0" }}>{pops.preview.rewardProgressPct}%</strong>
                </>
              ) : null}
              {pops.isReadyToVerify ? (
                <span style={{ display: "block", marginTop: 6, color: "#86efac" }}>Ready to verify</span>
              ) : null}
            </div>
            <PopsStatusChip status={pops.userVisibleStatus} variant={chipVariant(pops)} />
            <PopsRewardProgress
              progressPct={pops.progressPct}
              rewardGatePct={pops.preview?.rewardProgressPct}
              expectedReward={expectedReward}
              presenceConfidence={pops.preview?.presencePreview}
              attentionConfidence={pops.preview?.attentionPreview}
              fraudRisk={pops.preview?.fraudRiskPreview}
              status={pops.userVisibleStatus}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button type="button" style={btn()} onClick={pops.pause}>
                Pause
              </button>
              <button type="button" style={btn()} onClick={pops.resume}>
                Resume
              </button>
              <button type="button" style={btn()} onClick={pops.simulateAppBackground}>
                Background app
              </button>
              <button type="button" style={btn()} onClick={pops.simulateAppForeground}>
                Foreground app
              </button>
              <button type="button" style={btn()} onClick={pops.recordTap}>
                Tap
              </button>
              <button type="button" style={btn()} onClick={pops.recordScroll}>
                Scroll
              </button>
              <button
                type="button"
                style={btn(!pops.isReadyToVerify)}
                disabled={!pops.isReadyToVerify}
                onClick={pops.verifyMoment}
              >
                Verify moment
              </button>
            </div>
          </section>
        ) : null}

        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>Scenario controls</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={btn(!pops.session)} disabled={!pops.session} onClick={pops.completeClean}>
              Complete clean
            </button>
            <button type="button" style={btn(!pops.session)} disabled={!pops.session} onClick={pops.completePartial}>
              Complete partial
            </button>
            <button type="button" style={btn(!pops.session)} disabled={!pops.session} onClick={pops.simulateBackgroundFraud}>
              Background fraud
            </button>
            <button type="button" style={btn(!pops.session)} disabled={!pops.session} onClick={pops.simulateDeviceWarning}>
              Device warning
            </button>
            <button type="button" style={btn(!pops.session)} disabled={!pops.session} onClick={pops.simulateImpossibleCompletion}>
              Impossible fast
            </button>
            <button type="button" style={btn()} onClick={pops.reset}>
              Reset
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>Quick scenarios</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {POPS_DEMO_SCENARIOS.map((sc) => (
              <button key={sc.id} type="button" style={{ ...btn(), textAlign: "left" }} onClick={() => sc.run(pops)}>
                <div style={{ fontWeight: 600 }}>{sc.label}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{sc.description}</div>
              </button>
            ))}
          </div>
        </section>

        {pops.rewardDecision ? (
          <section style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <PopsMomentVerified judgment={pops.judgment} rewardDecision={pops.rewardDecision} walletIntent={pops.walletIntent} />
            <PopsPrivacyReceiptCard receipt={pops.privacyReceipt} />
            <PopsDemoRewardLedger
              entries={ledger.entries}
              totalPending={ledger.totalPending}
              totalHeld={ledger.totalHeld}
              deniedCount={ledger.deniedCount}
              onClear={ledger.clearLedger}
            />
          </section>
        ) : null}

        <footer style={{ marginTop: 16 }}>
          <PopsDemoDebugPanel
            session={pops.session}
            events={pops.events}
            aggregate={pops.aggregate}
            judgment={pops.judgment}
            rewardDecision={pops.rewardDecision}
            walletIntent={pops.walletIntent}
            privacyReceipt={pops.privacyReceipt}
          />
        </footer>
      </div>
    </div>
  );
}
