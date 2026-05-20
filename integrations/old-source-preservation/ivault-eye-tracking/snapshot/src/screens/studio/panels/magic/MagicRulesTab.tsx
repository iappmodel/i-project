import type { MagicReveal } from "../../studioTypes";
import type { StudioActions } from "../../studioStore";

export function MagicRulesTab({ reveal, actions }: { reveal: MagicReveal; actions: StudioActions }) {
  const e = reveal.eligibility;
  const u = reveal.unlockPolicy;

  return (
    <div className="ist-grid2">
      <div className="ist-field">
        <label className="ist-label">Min age</label>
        <input
          className="ist-input ist-mono"
          type="number"
          placeholder="—"
          value={e.minAge ?? ""}
          onChange={(ev) =>
            actions.updateMagicEligibility(reveal.id, {
              ...e,
              minAge: ev.target.value ? Number(ev.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Min trust score</label>
        <input
          className="ist-input ist-mono"
          type="number"
          placeholder="—"
          value={e.minTrustScore ?? ""}
          onChange={(ev) =>
            actions.updateMagicEligibility(reveal.id, {
              ...e,
              minTrustScore: ev.target.value ? Number(ev.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!e.requireVerifiedHuman}
            onChange={(ev) => actions.updateMagicEligibility(reveal.id, { ...e, requireVerifiedHuman: ev.target.checked })}
          />
          Require verified human
        </label>
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input type="checkbox" checked={!!e.requireFollower} onChange={(ev) => actions.updateMagicEligibility(reveal.id, { ...e, requireFollower: ev.target.checked })} />
          Require follower
        </label>
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={!!e.requireSubscriber}
            onChange={(ev) => actions.updateMagicEligibility(reveal.id, { ...e, requireSubscriber: ev.target.checked })}
          />
          Require subscriber
        </label>
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input type="checkbox" checked={!!e.requireLocation} onChange={(ev) => actions.updateMagicEligibility(reveal.id, { ...e, requireLocation: ev.target.checked ? { latitude: 0, longitude: 0, radiusMeters: 500 } : undefined })} />
          Location required (mock)
        </label>
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Reveal at (ISO mock)</label>
        <input
          className="ist-input ist-mono"
          placeholder="2026-05-01T12:00:00Z"
          value={e.revealAt ?? ""}
          onChange={(ev) => actions.updateMagicEligibility(reveal.id, { ...e, revealAt: ev.target.value || undefined })}
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Reveal after verified views</label>
        <input
          className="ist-input ist-mono"
          type="number"
          placeholder="—"
          value={e.revealAfterVerifiedViews ?? ""}
          onChange={(ev) =>
            actions.updateMagicEligibility(reveal.id, {
              ...e,
              revealAfterVerifiedViews: ev.target.value ? Number(ev.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Reveal after total tips</label>
        <input
          className="ist-input ist-mono"
          type="number"
          placeholder="—"
          value={e.revealAfterTotalTips ?? ""}
          onChange={(ev) =>
            actions.updateMagicEligibility(reveal.id, {
              ...e,
              revealAfterTotalTips: ev.target.value ? Number(ev.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="ist-field" style={{ gridColumn: "1 / -1" }}>
        <label className="ist-label">Unlock duration</label>
        <select
          className="ist-input"
          value={u.duration}
          onChange={(ev) =>
            actions.updateMagicUnlockPolicy(reveal.id, {
              ...u,
              duration: ev.target.value as MagicReveal["unlockPolicy"]["duration"],
            })
          }
        >
          {(["once", "session", "24h", "7d", "permanent"] as const).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="ist-field">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input type="checkbox" checked={u.transferable} onChange={(ev) => actions.updateMagicUnlockPolicy(reveal.id, { ...u, transferable: ev.target.checked })} />
          Transferable
        </label>
      </div>
      <div className="ist-field">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <input type="checkbox" checked={u.refundable} onChange={(ev) => actions.updateMagicUnlockPolicy(reveal.id, { ...u, refundable: ev.target.checked })} />
          Refundable
        </label>
      </div>
      <div className="ist-field">
        <label className="ist-label">Max unlocks / viewer</label>
        <input
          className="ist-input ist-mono"
          type="number"
          placeholder="—"
          value={u.maxUnlocksPerViewer ?? ""}
          onChange={(ev) =>
            actions.updateMagicUnlockPolicy(reveal.id, {
              ...u,
              maxUnlocksPerViewer: ev.target.value ? Number(ev.target.value) : undefined,
            })
          }
        />
      </div>
      <div className="ist-field">
        <label className="ist-label">Max total unlocks</label>
        <input
          className="ist-input ist-mono"
          type="number"
          placeholder="—"
          value={u.maxTotalUnlocks ?? ""}
          onChange={(ev) =>
            actions.updateMagicUnlockPolicy(reveal.id, {
              ...u,
              maxTotalUnlocks: ev.target.value ? Number(ev.target.value) : undefined,
            })
          }
        />
      </div>
      <p className="ist-mono" style={{ fontSize: 10, gridColumn: "1 / -1", color: "var(--ist-muted)", lineHeight: 1.6 }}>
        Age gates cannot be bypassed by payment. Trust gates protect creator control. Blocked reveals prevent publishing.
      </p>
    </div>
  );
}
