# Canonical app workspace bootstrap

**Created:** `app/` — Vite + React + TypeScript investor MVP demo shell.

## What was created

| Path | Purpose |
|------|---------|
| `app/` | Canonical runnable demo (replaces “future app workspace” placeholder) |
| `app/src/components/` | Internal design system: `AppShell`, `PhoneFrame`, `BottomNav`, `HeaderBar`, `Button`, `Card`, `CurrencyChip`, `VerificationGate`, `ProgressBar`, `SourceEvidence` |
| `app/src/data/demoData.ts` | Mock wallet, offer, campaign, gates, transactions, 60/30/10 split, proof-layer status |
| `app/src/screens/` | Twelve screens with state-based routing in `App.tsx` (no React Router) |
| `app/src/state/` | `DemoProvider` session state (balances, selected offer, verification phase) |

## Relationship to prototype-app launcher

- **`prototype-app/index.html`** remains the archive index for rescued HTML, docs, and integration copies.
- **`app/`** is the **live product-shaped shell** for the investor walkthrough. The launcher links to `app/index.html` (static entry) and this doc; run the dev server for the interactive flow.

## Relationship to MVP_CANONICAL_FLOW.md

`docs/MVP_CANONICAL_FLOW.md` maps rescued files to the ten-step investor narrative. This app implements that spine in React:

`splash → feed → offer-detail → watch-verify → verification-result → reward-reveal → wallet → convert → withdraw-preview → creator-economics → proof-layer → roadmap`

Each screen includes a **Source evidence** footer listing repo files used as reference.

## Relationship to flutter-runtime

- **Not modified:** `integrations/eye-tracking/flutter-runtime/` source is untouched.
- **Proof layer screen** documents the promotion path (`FLUTTER_RUNTIME_PROMOTION_REPORT.md`) and planned Android smoke test.
- **Next integration step:** bridge mocked gaze in `WatchVerifyScreen` to flutter-runtime channel (out of scope for this bootstrap).

## How to run

```bash
cd app
npm install
npm run dev
```

Open the URL printed by Vite (typically `http://localhost:5173`).

Other scripts:

```bash
npm run typecheck
npm run build
npm run preview
```

## What is still mocked

- Gaze / camera signals (oscillating attention score + timer only)
- Five verification gates (cosmetic sequencing, no `process-earning` backend)
- Wallet, convert, and withdraw (session-local state; no payment processor)
- Feed content (static cards; no API)
- Pay rail (routes to convert preview)
- Flutter native vision pipeline (documented, not connected)

## Next recommended build step

1. **Wire flutter-runtime smoke path** — follow `docs/technical/ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md` without changing flutter-runtime sources in-place; feed real or stub gaze events into `WatchVerifyScreen`.
2. **Optional:** add presenter Prev/Next strip (from `integrations/eye-tracking/demos/investor-demo`) for live pitches.
3. **Optional:** persist demo session to `localStorage` for repeatable investor rehearsals.
