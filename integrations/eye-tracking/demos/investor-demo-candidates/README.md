# Investor demo — comparison candidates

## Why this folder exists

The archive already contains a **canonical** React investor walkthrough at:

`integrations/eye-tracking/demos/investor-demo/`

That copy was imported earlier from the eye-tracking worktree. A **newer external snapshot** on disk (`~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app/investor-demo`) differs in several UI and presenter files while keeping an **identical** `package.json`.

This folder preserves the external snapshot **as a versioned comparison candidate** so reviewers can diff behavior and copy without overwriting the canonical demo.

## Source (read-only; not modified)

| Field | Value |
|-------|--------|
| External path | `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app/investor-demo` |
| Copied into archive | `from-ivault-investor-demo/` (this tree) |
| Copy date | 2026-05-20 |
| External repo touched | **No** — copy-only import |

## Canonical vs candidate

| Role | Path |
|------|------|
| **Canonical** (do not replace without review) | `integrations/eye-tracking/demos/investor-demo/` |
| **Candidate** (IVAULT snapshot) | `integrations/eye-tracking/demos/investor-demo-candidates/from-ivault-investor-demo/` |

Full diff notes: [`docs/technical/INVESTOR_DEMO_VARIANT_COMPARISON.md`](../../../docs/technical/INVESTOR_DEMO_VARIANT_COMPARISON.md)

## Files known to differ from canonical

Only these paths differ between canonical and `from-ivault-investor-demo` (all other copied source files match):

- `src/components/PresenterStrip.tsx` — adds “Next path” flow legend from `screensOrder`
- `src/demo/screensOrder.ts` — adds `DEMO_SCREEN_FLOW_LABELS` and `presenterFlowLegendShort()`
- `src/index.css` — presenter legend styling
- `src/prototypes.css` — feed layout, watch HUD, verification gate UI
- `src/screens/FeedScreen.tsx` — feed chrome / scroll layout wrapper
- `src/screens/WatchVerifyScreen.tsx` — watch HUD, attention ring labels, demo harness copy
- `src/screens/VerificationResultScreen.tsx` — gate labels, interval-based pass sequencing

`package.json` is **identical** between both trees.

Screen **order** (`DEMO_SCREEN_FLOW`) is unchanged; differences are presentation, copy, and timing/UX polish—not a different MVP route.

## What was copied

Per-file allowlist only (no `node_modules`, no `dist`, no build caches):

- `src/`, `public/`, `design-ref/`
- `README.md`, `package.json`, `package-lock.json`
- `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html`, `.gitignore`

## What was excluded

- `node_modules/`
- `dist/`
- `.vite/`, `coverage/`, `*.tsbuildinfo`, and other cache/build artifacts

## Review policy

**Do not** point the archive launcher or docs at this candidate as the default demo until review is complete.

When merging improvements into canonical:

1. Inspect **screen behavior** first (Feed → Watch → Verify), against [`docs/MVP_CANONICAL_FLOW.md`](../../../../docs/MVP_CANONICAL_FLOW.md).
2. Prefer UX changes only if they support the canonical Loop 1 spine.
3. Never import `node_modules` or `dist`.
4. Merge **one file at a time** with explicit diff review.

To run the candidate locally (optional, after review): `cd from-ivault-investor-demo && npm install && npm run dev` — not run automatically during import.
