import type { PostPackage } from "../publish/studioPublishTypes";
import { findWalletAccountByType } from "../wallet/studioWalletUi";
import type { StudioController } from "../studioStore";
export function StudioPostCardPreview({ studio, pkg }: { studio: StudioController; pkg: PostPackage }) {
  const creator = findWalletAccountByType(studio.state.walletAccounts, "creator");
  const activeMagic = pkg.magicReveals.filter((r) => r.status === "active" && r.revealType !== "always_hidden");
  const paid = activeMagic.some((r) => r.revealType === "pay_to_reveal" || r.revealType === "tip_to_reveal");
  const rewarded = activeMagic.some((r) => r.reward?.viewerRewardEnabled);
  const age = pkg.ageRating;

  return (
    <div
      className="ist-panel"
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98))",
        maxWidth: 360,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "linear-gradient(135deg,#5eead4,#a78bfa)",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
              {creator?.displayName ?? "Creator"}
            </div>
            <div className="ist-mono" style={{ fontSize: 9, color: "var(--ist-muted)" }}>
              @{creator?.userId ?? "creator"} · {pkg.publishTarget}
            </div>
          </div>
        </div>
        {pkg.runtimeConfig.showWalletChip ? (
          <span className="ist-chip ist-chip--ok ist-mono" style={{ fontSize: 9, flexShrink: 0 }}>
            Wallet
          </span>
        ) : null}
      </div>
      <div style={{ position: "relative", aspectRatio: "9/16", background: "rgba(0,0,0,0.45)" }}>
        <img
          src={pkg.exportManifest.thumbnailUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
        />
        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {activeMagic.length > 0 ? (
            <span className="ist-chip ist-chip--warn ist-mono" style={{ fontSize: 9 }}>
              Magic ×{activeMagic.length}
            </span>
          ) : null}
          {paid ? (
            <span className="ist-chip ist-chip--bad ist-mono" style={{ fontSize: 9 }}>
              Paid unlock
            </span>
          ) : null}
          {rewarded ? (
            <span className="ist-chip ist-chip--ok ist-mono" style={{ fontSize: 9 }}>
              Viewer reward
            </span>
          ) : null}
          {age !== "everyone" && age !== "teen" ? (
            <span className="ist-chip ist-mono" style={{ fontSize: 9, background: "rgba(248,113,113,0.2)", color: "#fecaca" }}>
              {age}
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <p style={{ fontSize: 13, margin: "0 0 8px", lineHeight: 1.35 }}>{pkg.caption}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {pkg.hashtags.map((h) => (
            <span key={h} className="ist-mono" style={{ fontSize: 11, color: "#7dd3fc" }}>
              #{h}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {pkg.disclosures
            .filter((d) => d.visibleToViewer)
            .slice(0, 4)
            .map((d) => (
              <span key={d.id} className="ist-chip ist-chip--muted ist-mono" style={{ fontSize: 9 }}>
                {d.label}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
