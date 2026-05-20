# Decision log — eye tracking app

**Status:** Active. **Last updated:** 2026-04-23.

This file resolves the six seed questions from [`docs/obsidian-vault/Projects/eye-tracking-app/00-MOC-eye-tracking-app.md`](obsidian-vault/Projects/eye-tracking-app/00-MOC-eye-tracking-app.md) into **recorded decisions** and an **implementation backlog**. Vault copies may tag notes `#eye-tracking/decision` and link here as the repo source of truth.

---

## Summary

| # | Topic | Decision (one line) |
|---|--------|---------------------|
| 1 | Autonomy UX | **Tiered:** irreversible / high-impact actions require explicit confirmation by default; low-risk reversible actions may auto-execute only after kernel approval and user opt-in to “autopilot.” |
| 2 | Confidence UI | **Hybrid:** subtle ambient signal during normal operation; **explicit** explanation when an action is blocked, deferred, or executed at boundary thresholds. |
| 3 | iOS | **Android-first v1:** ship the proven MediaPipe path on Android; iOS keeps **camera permission + honest “gaze unavailable” UX** until a chosen parity technology is implemented. |
| 4 | Accessibility | **Dwell-first + platform a11y:** gaze/dwell remains the primary modality; **VoiceOver / TalkBack** and **Switch Access** must not be blocked; optional voice commands are backlog, not v1 gate. |
| 5 | Battery / camera | **Default `ResolutionPreset.medium`** (per `AGENTS.md`); optional user setting for higher quality with **in-app battery impact note**; validate with profiling before changing default. |
| 6 | Telemetry | **Local-first, opt-in cloud:** structured audit events stay on-device by default; any network/export requires **consent + data minimization**; retention and export documented before shipping analytics. |

---

## Q1 — Autonomous actions: default allow vs confirm by safety tier?

**Decision**

- **Default posture:** **Confirm-first** for any action that is not trivially reversible or that exceeds a configurable “auto tier” threshold. Align UI with existing kernel concepts (`GovernanceKernel`, `SafetyKernel`, risk caps, reversibility flags in `AutonomousExecutionKernel`).
- **Auto-allowed (subject to existing gates):** actions explicitly tagged **reversible**, **low blast radius**, and **below** governance risk thresholds — only after the user has enabled **Autopilot** (or equivalent) in settings.
- **Always confirm (v1):** destructive, financial, external-communication, or permission-escalating actions regardless of Autopilot.

**Rationale**

Engineering defaults already enforce fixation, dwell, confidence, and rate limits; **user consent** is the missing product layer for “serious done.” Tiered confirm matches user trust and reduces false-positive harm without blocking demos.

**Backlog**

- [ ] Define an `ActionSafetyTier` (or map `UIActionType` → tier) shared by UI and kernels.
- [ ] Settings: Autopilot off/on + optional per-tier toggles (documented copy).
- [ ] Confirmation UI pattern (sheet/snackbar with “why” string from kernel evaluation).
- [ ] Tests: matrix of tier × Autopilot × kill switch → expected allow / confirm / deny.

---

## Q2 — User-visible confidence: subtle vs explicit?

**Decision**

- **Subtle:** thin confidence strip, color pulse, or icon state tied to **live** pipeline + safety margin (no spam).
- **Explicit:** when `tryExecute` rejects, defers, or fires at **near-threshold** confidence, show a **short, human-readable reason** (map kernel codes to copy; avoid raw numbers unless debug mode).

**Rationale**

Users need **calibration of trust** without cognitive overload; failures at the boundary are when explanation matters most (per MOC brainstorm on false-positive UX).

**Backlog**

- [ ] UX spec: states for idle / tracking / blocked / executed.
- [ ] Plumb last evaluation snapshot from `AutonomousExecutionKernel` to a non-debug `ValueNotifier` / state for UI.
- [ ] “Why blocked” string table keyed by `KernelEvaluation` / safety denial reason.
- [ ] Optional debug overlay (existing dev patterns in `main.dart`) for numeric confidence.

---

## Q3 — iOS parity path?

**Decision**

- **v1 scope:** **No iOS gaze parity commitment.** Runner targets may request camera for preview or future work, but **no claim** of eye-tracking accuracy on iOS until implemented.
- **Parity candidates (prioritized for a future spike, not decided here):** on-device Apple **Vision** / ARKit face APIs vs **MediaPipe iOS** vs reduced feature set (head-only pointing). Choice is deferred to a **spike ADR** after Android v1 stabilizes.

**Rationale**

Android vertical slice is evidence-backed; duplicating gaze quality on iOS is a **multi-sprint** investment. Explicit scope avoids false marketing and focuses QA.

**Backlog**

- [ ] iOS: clear **copy + empty state** when `vision_channel` / gaze is unavailable.
- [ ] Spike ADR: 1–2 week time-boxed evaluation of ARKit vs MediaPipe for gaze fidelity + latency.
- [ ] If parity proceeds: channel symmetry doc (`native-ios-vision`) + contract versioning (see MOC native note brainstorm).

---

## Q4 — Accessibility: voice vs dwell?

**Decision**

- **Primary interaction:** **Dwell + fixation** (already aligned with `AGENTS.md` and fixation gating).
- **Platform accessibility:** **Mandatory** — focus order, labels, headings, and **no reliance on gaze alone** for critical flows; support **Switch Control** / keyboard equivalents where Flutter allows.
- **Voice commands:** **Optional enhancement** after v1; not a substitute for VoiceOver.

**Rationale**

Dwell matches the product’s eye-driven thesis; Apple/Google accessibility expectations require **parallel** usable paths.

**Backlog**

- [ ] Audit primary flows with TalkBack/VoiceOver (zones, calibration, kill switch, settings).
- [ ] Ensure kill switch and Autopilot toggles are large targets with semantic labels.
- [ ] Document “accessibility test matrix” in vault or `docs/`.
- [ ] Future: voice intent channel behind same kernel gates (intent-os brainstorm).

---

## Q5 — Battery: camera preset vs quality?

**Decision**

- **Ship default:** **`ResolutionPreset.medium`** for front camera unless profiling on target devices shows insufficient landmark stability.
- **User control (backlog):** optional **High** quality toggle with inline note (“may reduce battery life”).
- **Engineering:** measure CPU/GPU + thermals and frame drop when raising preset; do not flip default without data.

**Rationale**

`AGENTS.md` already encodes team preference; productizing the choice avoids endless debate while leaving an escape hatch for power users.

**Backlog**

- [ ] Add settings toggle + persistence (e.g. `shared_preferences`).
- [ ] Simple in-app FPS / dropped-frame counter in dev builds to correlate preset vs stability.
- [ ] Document measurement methodology in `AGENTS.md` or a short `docs/perf-camera-preset.md` when data exists.

---

## Q6 — Telemetry boundaries?

**Decision**

- **On-device audit:** extend beyond `debugPrint` — **ring buffer or append-only local log** of structured decision events (timestamp, action id, allow/deny, reason code, confidence snapshot hash — **no raw frame imagery** in logs by default).
- **Export:** **opt-in**, explicit user action (e.g. “Export debug bundle”), with **what’s included** listed before confirm.
- **Cloud / third-party analytics:** **off by default**; if added later, require **consent screen**, **data minimization**, documented retention, and region/legal review.

**Rationale**

Matches privacy expectations for a camera-heavy app and prepares for audit log productization from the MOC brainstorm without over-building v0.

**Backlog**

- [ ] Define JSON schema (or protobuf-lite) for `AuditEvent` and sink implementers (`FileAuditSink`, `MemoryRingBufferSink`).
- [ ] Wire `auditSink` in `AutonomousExecutionKernel` to non-debug sink in release builds when “diagnostics” enabled.
- [ ] Privacy copy: in-app Privacy section + link from export flow.
- [ ] If analytics added: consent gate + feature flag + kill switch interaction tests.

---

## Cross-cutting backlog (priority hints)

1. **P0 — Consent & clarity:** Q1 confirmation flows + Q6 local audit schema + privacy copy.
2. **P1 — Trust UX:** Q2 confidence / “why blocked” + false-positive cooldown copy (MOC brainstorm).
3. **P2 — Platform:** Q3 iOS honest UX + spike ADR scheduling.
4. **P2 — Quality of life:** Q5 preset toggle + measurement doc.
5. **P1 — Accessibility:** Q4 audit fixes on critical paths.

---

## References

- [`AGENTS.md`](../AGENTS.md) — operational numbers and platform facts.
- [`docs/obsidian-vault/Projects/eye-tracking-app/00-MOC-eye-tracking-app.md`](obsidian-vault/Projects/eye-tracking-app/00-MOC-eye-tracking-app.md) — architecture dashboard and atomic note links.

When a backlog item ships, prefer a one-line update here (for example “Implemented in PR #NN”) or migrate detailed status to your issue tracker.
