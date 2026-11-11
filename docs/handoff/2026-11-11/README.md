# [ i ] Full Development Handoff — November 11, 2026

## Status and source map
This is a **handoff checkpoint**, NOT a validated integration, migration, production deployment, or completion of the entire app. Two agent lanes start from this same source tree and must make independent, reviewable changes.

**Canonical app repository**: `iappmodel/i-project`, main source commit `3d2336b711f864e87a5cc34a2ade2efe7cc15bd5`; runnable React/TypeScript + Vite + Capacitor shell in `app/`. GitHub `main` was last committed 2026-06-02; do not assume the main app is up to date with independent POP V10 work.

**POP V10 laboratory**: `iappmodel/i-pop-lab`, GPT-owned `gpt-pop-twin-independent` commit `f7a9d0bd522e0de77bfcd1f2f7fc59f713d33628`. Full CI run `43100361130` and Chromium `43100361049` both SUCCESS. M3 architecture and M4 hands-free engineering technical work completed; M5 validation **infrastructure** implemented but no empirical device/human validation; rollout HOLD. Do not merge this lab into the app automatically.

**Claude's existing POP lab branch**: `i-pop-lab:twin-integration`. Treat as immutable to this handoff and inspect only for comparative context. Do not push, rebase, or merge it.

**Other repositories**: `iappmodel/i-initial-structures` is a supporting architecture/code reference, not the primary app; `iappmodel/i-the-app` currently contains only README and must NOT silently replace `i-project/app`.

## Product constitution and conflict policy
Read in this order:
1. `MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md` — owner-declared product constitution
2. `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md` — consumer UI: immersive full-bleed glass shell (not dashboard-first)
3. `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md`
4. `MASTER_BRAIN/CANONICAL/FEATURE_BIBLE.md`
5. `docs/MVP_CANONICAL_FLOW.md`, `docs/APP_WORKSPACE_BOOTSTRAP.md`
6. `.cursor/rules/*.md`, `MASTER_BRAIN/DEVELOPMENT_LOG.md`
7. POP: `docs/pop-v10/M5_READINESS_PLAN.md`, `M5_VALIDATION_INFRASTRUCTURE_CLOSEOUT.md`, `STATUS.md`, `PROGRESS.md`, `DECISIONS.md` **in POP lab**, not this app repo.

**Known canonical contradiction**: the older app constitution and legacy mockups describe a universal trust score, expression-sensitive attention scores, automatic payouts/conversion, and multiple alphabet currencies. Later POP V10 deliberately removes expression/attention_score from proof/payment, removes universal trust tiers, uses claim-specific review, and limits operational ledgers to iCoins/vCoins server-owned. Preserve visionary documents as product intent but DO NOT restore those removed mechanisms in executable verification or economy paths. Record clashes and request owner review before changing monetary semantics. No historic mock is proof of production functionality.

## Build objective
Develop [ i ] as a modular immersive attention-wallet / media marketplace: Feed, POP opt-in presence, Earn/offer loop, local nonredeemable review result, Wallet demos, Profile, Creator/Studio, advertiser campaigns, platform connections, iCOMMAND and accessibility. Keep the three product loops coherent: Watch→Verify→Earn (demo only), Browse→Save→Return, Balance→Convert→Use (simulation only until authorized backend). The immediate requirement is **a reliable local investor/test app**, not live financial processing.

## Baseline verification and execution
```bash
git status --short
git rev-parse HEAD
cd app
npm ci
npm run typecheck
npm run build
npm run dev
```
Read actual scripts before running anything else. `app/package.json` contains no top-level `test` script in the inspected main snapshot; discover test commands per package and do not claim tests exist if absent. Review tracked files for credentials/keys before sharing output.

## First execution sequence — do not skip
0. Freeze repo health: inspect current branch, working tree, dependencies, build output, lint/tests, runtime screenshots and existing mocks. Produce an evidence-tagged feature inventory with Confirmed in code / Documented only / Mock / Broken / Unverified and exact file paths.
1. Reproduce and measure the existing immersive consumer experience before redesign. Map every action/button, screen/route and state. No ghost buttons.
2. Fix critical accessibility, control provenance, camera consent/cancellation/teardown and privacy boundary regressions in small commits, keeping prototype/demo semantics explicit.
3. Make a deterministic local end-to-end demo: feed→offer→consent→watch→local outcome→pending mock wallet; all financial actions clearly disabled/simulated. Never show local verification as authentic payout authority.
4. Test camera/selector/dwell behavior under browser automation separately from POP Twin synthetic tests. Physical S24 Chrome and iPhone Safari studies require real devices and consent; never fabricate results.
5. Write an **integration proposal only** for moving reviewed POP V10 interfaces from the separate lab into the main app, with interface ownership, diffs, flags, rollback and tests. No unreviewed wholesale copy.
6. Expand creator/campaign/social cross-platform features only after the core consumer loop and build gates remain green.

## Non-negotiable safety / ownership
- Do not edit `main` or `i-pop-lab:twin-integration`, and never overwrite original archive files or `08_raw_originals/`.
- No production deployment, secrets, unrestricted APIs, model downloads of unknown provenance, real money, payouts, conversions, wallet authority or client DB currency mutation. Supabase production migrations are forbidden.
- Keep on-device raw video, precise gaze, landmarks and audio local. No biometric telemetry/network leakage. Gaze/gesture/voice cannot directly authorize high-risk actions.
- No performance/identity/anti-spoofing claims from synthetic or Chromium results. All evidence tied to exact SHA, commands and outcomes.
- Respect features/flags and explicit consent; fail closed. Preserve accessible touch/keyboard fallbacks.
- Each atomic task: baseline→implementation→tests→commit→push your OWN branch→note failure and next action. Never loosen tests to pass.
- Never bulk-merge Cursor and Claude branches; compare patches, resolve conflicts, then use reviewed PRs.

## Parallel agent allocation
**Cursor lane**: implement and stabilize app UX and local demo integration under `handoff/cursor-app-2026-11-11`. See `CURSOR_START.md`.

**Claude lane**: independently audit architecture, privacy, economy boundaries and integration contracts, then implement independently scoped changes under `handoff/claude-app-2026-11-11`. See `CLAUDE_START.md`.

Both lanes start from the same shared handoff commit. Their results are independent experiments, not automatic replacements for production.

## Definition of done for first iteration
Each lane supplies: exact head SHA, changed paths, reproduction commands, build/typecheck results, screen/interaction map, list of mock vs real subsystems, test log summary, security/privacy gaps, failures, next smallest step and PR link. Compare quality, reliability, speed and cost before any integration approval.
