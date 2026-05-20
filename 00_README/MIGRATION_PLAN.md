# Migration Plan for [ i ]

## Objective

Move everything built in ChatGPT into a stable external platform where the project can evolve without losing context.

## Recommended platform stack

1. GitHub — permanent code/history storage.
2. Cursor — development environment.
3. Notion or Google Drive — readable product docs and investor materials.
4. Figma — polished UI, pitch visuals, flows, and diagrams.

## Phase 1 — Preserve

- Download this archive.
- Put it inside a local folder named `i-project`.
- Commit it to GitHub immediately.
- Do not edit the raw originals folder.

## Phase 2 — Organize

Create these canonical files:

- `docs/PROJECT_CANON.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ECONOMY_SPEC.md`
- `docs/MVP_SCOPE.md`
- `docs/PROTOTYPE_SCREEN_MAP.md`
- `docs/DECISION_LOG.md`

## Phase 3 — Convert prototypes into app

Start from the clickable prototype. Convert screen-by-screen into React components.

Execution rule:

- One page at a time.
- Every clickable element must resolve to a real state, modal, route, or disabled explanation.
- No ghost buttons.
- Do not move forward until the current screen is fully resolved.

## Phase 4 — Investor demo

Build one clean demo path:

1. Splash.
2. Feed.
3. Tap paid content.
4. Watch/verify attention.
5. Earn confirmation.
6. Wallet update.
7. Convert/cash out/spend.
8. Creator/brand economics.
9. Roadmap.

## Phase 5 — Production planning

After the demo exists as a live URL, define backend, ledger, verification, KYC/payment risk, and campaign marketplace in separate implementation tickets.
