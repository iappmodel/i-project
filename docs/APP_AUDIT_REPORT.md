# Canonical React Investor Demo — Audit Report

**Repo:** `i_project_migration_archive`  
**App:** `app/`  
**Audit date:** 2026-05-20  
**Scope:** Read-only product/code audit (no redesign, no large refactors).  
**Reference:** `docs/MVP_CANONICAL_FLOW.md`, `docs/APP_WORKSPACE_BOOTSTRAP.md`

---

## 1. Summary verdict

**Overall: PASS with caveats — suitable for a guided investor walkthrough.**

The `app/` workspace delivers a coherent **Loop 1 (Watch → Verify → Earn → Wallet → Cash-out narrative → Economics → Proof layer)** spine with **12 state-routed screens**, **source evidence on every screen**, **canonical 60/30/10 economics** (fixed vs the legacy investor-demo React percentages), and **clean TypeScript + production build**.

**Strengths**

- Happy-path navigation is complete: splash through wallet credit, convert, withdraw preview, creator economics, proof layer, and roadmap closer.
- `demoContext.tsx` centralizes ledger mutations (`finishRewardToWallet`) in one place; screen router in `App.tsx` is explicit.
- Source evidence paths overwhelmingly point at real archive files (verified on disk).
- Proof layer and roadmap extend the old `investor-demo` order in a way that matches MVP Step 10 and optional closer guidance.

**Primary risks for a live pitch**

- **Discover** bottom tab jumps to **Roadmap**, not a discover surface — easy presenter mistake.
- **Pay** wallet action routes to **Convert** — label mismatch.
- **No camera/consent gate** before watch (called out as Required in `MVP_CANONICAL_FLOW.md` for credibility).
- **Offer copy** says “Watch 4:30 **minutes**” but `watchDuration` is `MM:SS` (4 minutes 30 seconds).
- **Platform take rate** appears on offer detail (10% attention split) but **withdrawal fees** (bank vs instant) are not narrated alongside — investors may conflate the two fee contexts from the decision map.

**Code changes during audit:** None (report only).

---

## 2. Route audit table

Routing model: `DemoProvider` + `setScreen` / flow helpers — **no React Router**. Screen IDs in `app/src/state/types.ts`; render table in `app/src/App.tsx`.

| Screen | Primary CTAs / controls | Navigates to | Verdict |
|--------|-------------------------|--------------|---------|
| `splash` | Full-screen tap | `feed` | OK |
| `feed` | Sponsored card, Earn pill, wallet chip/header | `offer-detail`, `wallet` | OK (core) |
| `feed` | Stories row (6) | `feed` (no-op) | **Ghost** — visual only |
| `feed` | Pills: For you / Friends / Trending | `feed` (no-op) | **Weak** — only Earn does work |
| `feed` | Organic card | — (not pressable) | OK — caption directs to sponsored card |
| `feed` | Bottom: Feed | `feed` | OK |
| `feed` | Bottom: Discover | `roadmap` | **Misleading** — label ≠ destination |
| `feed` | Bottom: Wallet | `wallet` | OK |
| `offer-detail` | Back | `feed` | OK |
| `offer-detail` | Start watching | `watch-verify` | OK |
| `watch-verify` | Back | `offer-detail` | OK |
| `watch-verify` | Complete & verify (enabled ~100% progress) | `verification-result` | OK |
| `verification-result` | Collect reward (after gate animation) | `reward-reveal` | OK — no back row (forward-only by design) |
| `reward-reveal` | See wallet update / Later | `wallet` (+ ledger update) | OK — both CTAs identical outcome |
| `wallet` | Convert / Withdraw / Pay | `convert`, `withdraw-preview`, `convert` | **Pay → convert** misleading |
| `wallet` | Activity rows | `wallet` | **No-op** |
| `wallet` | See all | expands list (local state) | OK |
| `wallet` | Preview ACH / Creator economics / Earn more | `withdraw-preview`, `creator-economics`, `feed` | OK |
| `convert` | Confirm / Cancel / Back | clearing → `wallet` | OK |
| `convert` | mcoins / ucoins toggles | local only | Non-MVP depth (see §3) |
| `withdraw-preview` | % chips, dest rows | local state | OK |
| `withdraw-preview` | Confirm withdraw preview | `creator-economics` | OK — skips success screen (preview-only) |
| `creator-economics` | View proof layer / Back to feed | `proof-layer`, `feed` | OK |
| `proof-layer` | Continue / Replay watch | `roadmap`, `watch-verify` | OK — replay is presenter shortcut |
| `roadmap` | Restart demo / Return to feed | `splash` (reset), `feed` | OK |

### Bottom nav behavior

- Rendered **only on `feed`** (`FeedScreen.tsx`).
- **Feed** and **Wallet** tabs behave as labeled.
- **Discover → `roadmap`** bypasses the earn loop entirely; acceptable only if the presenter treats Discover as “appendix / closing,” not content discovery.

### Ghost / dead / misleading controls (summary)

| Control | Issue | Severity |
|---------|--------|----------|
| Stories | Re-navigate to current feed | P2 |
| Friends / Trending / For you pills | No filter effect | P2 |
| Discover tab | Opens roadmap | P1 |
| Pay (wallet) | Opens convert | P1 |
| Activity transaction buttons | `setScreen('wallet')` while on wallet | P2 |
| Reward “Later” vs “See wallet update” | Same handler | P2 |

---

## 3. MVP alignment table

Canonical spine from `MVP_CANONICAL_FLOW.md` (React reference: `integrations/eye-tracking/demos/investor-demo`).  
**Implemented app order** (`APP_WORKSPACE_BOOTSTRAP.md`):

`splash → feed → offer-detail → watch-verify → verification-result → reward-reveal → wallet → convert → withdraw-preview → creator-economics → proof-layer → roadmap`

| MVP step | Required? | In `app/`? | Screen(s) | Gap / note |
|----------|-----------|------------|-----------|------------|
| 1 — Open feed | Required | Yes | `splash`, `feed` | Stories/filters are chrome; no live API (expected mock). |
| 2 — Select paid content | Required | Yes | `feed` → `offer-detail` | Earn pill jumps straight to offer (skips re-tap card) — still Step 2. |
| 3 — Watch | Required | Yes | `watch-verify` | **Missing consent/camera gate** (HTML Loop 1 Step 3; React investor-demo also skipped). |
| 4 — Verify attention | Required | Yes | `verification-result` | Gates cosmetic; names differ slightly from masterplan (“Device signal” vs “Presence detected”). |
| 5 — Earn | Required | Yes | `reward-reveal` | Credits iCoins + tx; no settlement pipeline (expected). |
| 6 — Wallet updates | Required | Yes | `wallet` | Balance/tx update after reward; pending strip present. |
| 7 — Convert / withdraw / spend | Required (one path min) | Yes | `convert`, `withdraw-preview` | Pay/Tip not implemented; Pay mislabeled. Convert includes **mcoins/ucoins** (later-stage economy). |
| 8 — Creator / advertiser economics | Required | Yes | `creator-economics` | **60/30/10 aligned** via `ECONOMIC_SPLIT`; footnote calls out canonical HTML sources. |
| 9 — Platform take rate | Required | Partial | `offer-detail` (10% row) | Attention **10%** shown; **withdrawal fee policy** (bank free / instant 1.5%) only implicit in withdraw math, not explained in copy. |
| 10 — Proof layer (narrative) | Required (mock OK) | Yes | `proof-layer`, `watch-verify` badge | Strong doc links; flutter-runtime not wired (documented). |
| Roadmap closer | Optional | Yes | `roadmap` | Matches “optional closing slide” in decision map. |

### Missing required MVP steps

1. **Camera / consent gate** before watch (documented gap in canonical flow §Step 3).
2. **Explicit dual-fee narration** — attention platform share vs withdrawal/payment fees (§Step 9 open risk in decision map).

### Screens / features with non-MVP or later-stage ideas

| Item | Location | Why flagged |
|------|----------|-------------|
| `mcoins` / `ucoins` convert targets | `ConvertScreen.tsx` | Full alphabet economy — decision map says iCoins + aCoins mention only for first pass. |
| Tier 2 pool / 5% pool fee / rcoins clearing gates | `ConvertScreen.tsx` | Deep conversion mechanics beyond Loop 1 proof. |
| Stories + filter pills | `FeedScreen.tsx` | Feed polish; not needed to prove watch→earn. |
| Roadmap phases 2–3 | `RoadmapScreen.tsx` | Engineering horizon — fine as closer. |
| External wallet withdraw dest | `WithdrawPreviewScreen.tsx` | Extra rail vs bank/card. |
| Replay watch from proof layer | `ProofLayerScreen.tsx` | Presenter shortcut; can confuse linear story if clicked mid-pitch. |

---

## 4. Source evidence audit

Component: `app/src/components/SourceEvidence.tsx` — static path list per screen.

| Screen | Has footer? | Paths (summary) | Quality |
|--------|-------------|-----------------|--------|
| `splash` | Yes | `index4.html`, legacy `SplashScreen.tsx` | Good — hub + lineage |
| `feed` | Yes | `iapp_feed_screen.html`, `iapp_immersive_feed.html`, legacy Feed | Good — verified on disk |
| `offer-detail` | Yes | Loop 1 HTML, legacy Offer | Good |
| `watch-verify` | Yes | Loop 1 HTML, legacy Watch | Good |
| `verification-result` | Yes | Loop 1 HTML, masterplan ref, legacy | Good — masterplan is doc not file path |
| `reward-reveal` | Yes | Loop 1, `acoins_earning_system.html`, legacy | Good |
| `wallet` | Yes | wallet HTML trio, legacy | Good — filenames with `(1)` exist |
| `convert` | Yes | convert + confirmation HTML; legacy on form phase only | Good |
| `withdraw-preview` | Yes | withdraw HTML, pending tab, legacy | Good |
| `creator-economics` | Yes | creator economy, campaign builder, pitch | Good |
| `proof-layer` | Yes | `EYE_TRACKING_INTEGRATION_MAP.md`, Flutter promotion, Android smoke plan | **Strong** — primary engineering evidence |
| `roadmap` | Yes | `MVP_CANONICAL_FLOW.md`, legacy Roadmap | Good |

### Cross-cutting notes

- **All 12 screens include source evidence** — no missing footers.
- Many paths reference **`integrations/eye-tracking/demos/investor-demo/...`** (superseded implementation). Still **useful for lineage**; consider adding `app/src/screens/<Name>.tsx` paths in a future pass so evidence points at the canonical app itself (already done on some screens).
- `verification-result` cites `` `01_strategy_docs/i-app-masterplan.md (5-gate qualification)` `` — parenthetical qualifier is fine for presenters; not a clickable path.
- **Proof layer** correctly cites `docs/technical/*` files that exist in this repo.

### Weak / missing evidence references

| Gap | Recommendation |
|-----|----------------|
| `convert` clearing phase omits legacy React path | Add `app/src/screens/ConvertScreen.tsx` to clearing-phase footer for parity |
| Step 9 fee schedule | Add `04_wallet_payments/iapp_withdraw_screen.html` or `i-creator-pitch_1.html` to withdraw or offer footers when narrating fees |
| Consent (missing screen) | When consent is added, cite Loop 1 HTML Step 3 |

---

## 5. UX / copy issues

### Investor narrative clarity (9-point checklist)

| # | Story beat | Clear in app? | Notes |
|---|------------|---------------|-------|
| 1 | User opens feed | **Yes** | Splash → feed; sponsored card labeled. |
| 2 | Taps paid content | **Yes** | Sponsored card + Earn pill. |
| 3 | Watches | **Mostly** | Timer/ring/earn bar work; **no consent step**; badge says “demo harness”. |
| 4 | Attention verified | **Yes** | 5-gate screen with staged animation. |
| 5 | Earns | **Yes** | Reward reveal with breakdown. |
| 6 | Wallet updates | **Yes** | “See wallet update” credits balance + new tx. |
| 7 | Convert / withdraw | **Yes** | Both screens reachable; preview-only copy on withdraw. |
| 8 | Creator / advertiser economics | **Yes** | 60/30/10 + live campaign card. |
| 9 | Proof layer status | **Yes** | Dedicated `proof-layer` screen with signal path + flutter status. |

### Confusing copy or weak transitions

| Issue | Where | Severity |
|-------|-------|----------|
| “Watch **4:30 minutes**” | `OfferDetailScreen.tsx` — duration is `MM:SS`, not minutes | P1 |
| Header wallet chip shows raw number (`847`) without `i` suffix | `FeedScreen` + `CurrencyChip` | P2 |
| `walletBalance` prop actually passes **iCoins** on feed | `HeaderBar` naming | P2 |
| USD estimate on wallet vs iCoin credit use different implied rates (`finishRewardToWallet` uses `×0.11`, withdraw preview uses `×0.01`) | `demoContext` / `WithdrawPreviewScreen` | P2 — demo-only inconsistency |
| “Confirm withdraw preview” → jumps to **creator economics** (no withdraw success) | `WithdrawPreviewScreen` | P1 — acceptable if narrated as preview |
| Discover tab | Bottom nav | P1 |
| Pay → Convert | `WalletScreen` | P1 |
| Verification screen has no back affordance | `VerificationResultScreen` | P2 — forward-only loop |
| Convert “Tier 2” / rcoins jargon | `ConvertScreen` | P2 — investor may need one-line setup |

---

## 6. Code quality issues

### TypeScript

- `npm run typecheck` — **PASS** (`tsc -b --noEmit`).
- Strict context guard in `useDemo.ts` — good.
- `App.tsx` `Record<DemoScreenId, ReactElement>` exhaustively covers all screen IDs — good.

### State routing

- Single `currentScreen` + helpers (`selectOffer`, `startWatchFlow`, `completeVerification`, etc.) — clear for a demo.
- `withScreen` sets `verificationStatus: 'watching'` when entering `watch-verify` — correct.
- **No guard** preventing `verification-result` if `verificationStatus !== 'verifying'` (only reachable via normal flow today).
- `SCREEN_FLOW` in `demoData.ts` is **exported but unused** — drift risk vs `App.tsx` order.

### Duplicated constants

- Offer, split, wallet initial, gates, proof status centralized in `demoData.ts` — **good**.
- `ConvertScreen` local `rates` / `clearingGates` — screen-local (acceptable).
- `WithdrawPreviewScreen` local `wFees` / `wTimes` — screen-local (acceptable).

### Component usage

- `Card` polymorphic `as="button"` for sponsored feed — correct.
- `Button` spreads native button props — good for `disabled`.
- `VerificationGate` duplicates checkmark in icon + tick column — cosmetic only.

### CSS

- **~3,392 lines** across `index.css` (1714), `prototypes.css` (1333), `design-system.css` (345).
- Built CSS **~59 KB** gzip **10.4 KB** — acceptable for demo; maintenance cost is high.
- Dual class prefixes (`ds-*` + legacy `prot-*` / `*-wu`) — intentional bridge; risk of specificity conflicts when editing.
- No major runtime style conflicts observed; phone frame + scroll modes work per screen.

### Accessibility basics

| Area | Status |
|------|--------|
| Splash enter | `aria-label="Enter feed"` |
| Story buttons | Per-story `aria-label` |
| Decorative SVG/scrim | `aria-hidden` in places |
| Bottom nav tabs | **No** `aria-current` on active tab |
| Gate list | Visual pass/fail only — no `aria-live` for screen reader progress |
| Focus management on screen change | **None** — expected gap for demo shell |

---

## 7. Build / typecheck result

Executed from `app/`:

```text
npm run typecheck  → PASS (tsc -b --noEmit)
npm run build      → PASS (tsc -b && vite build, ~413ms)
  dist/assets/index-dsdPPVVt.css   58.97 kB │ gzip: 10.39 kB
  dist/assets/index-CjPJglxY.js   229.43 kB │ gzip: 70.24 kB
```

---

## 8. Prioritized fix list

### P0 — blocking

| # | Issue | Rationale |
|---|--------|-----------|
| — | *None identified* | Happy path works end-to-end; build passes. Presenter-led demo is viable today. |

**P0 count: 0**

### P1 — important

| # | Issue | Suggested fix (future pass) |
|---|--------|----------------------------|
| 1 | Discover tab → roadmap | Rename tab to “Roadmap” or route to a stub discover sheet that links forward |
| 2 | Pay → convert | Route to dedicated pay preview or rename label “Convert (preview)” / disable Pay |
| 3 | Missing consent before watch | Port Loop 1 HTML Step 3 copy as a screen or modal before `watch-verify` |
| 4 | “Watch 4:30 minutes” copy | Change to “Watch full spot (4:30)” or “Watch 4 min 30 sec” |
| 5 | Dual fee context (10% attention vs withdraw fees) | One line on `withdraw-preview` + offer footnote or presenter card |
| 6 | Withdraw confirm jumps to economics | Add brief toast/inline “Preview only — no funds moved” if keeping navigation |
| 7 | `integrations/.../investor-demo` paths in evidence | Add parallel `app/src/screens/...` paths as canonical references |

**P1 count: 7**

### P2 — polish

| # | Issue |
|---|--------|
| 1 | Stories / filter pills no-op |
| 2 | Activity rows no-op on wallet |
| 3 | Reward Later vs primary — same action |
| 4 | `SCREEN_FLOW` unused — wire to tests or delete |
| 5 | Header chip format (`847` vs `847 i`) |
| 6 | FX rate inconsistency (0.11 vs 0.01) |
| 7 | CSS bundle / dual naming cleanup over time |
| 8 | Bottom nav `aria-current` |
| 9 | Trim mcoins/ucoins from convert for investor-only build flag |
| 10 | Verification gate names vs masterplan wording |

**P2 count: 10**

---

## 9. Recommended next implementation task

**Primary (engineering credibility):** Add a **minimal consent / camera gate screen** (content port from `06_feed_earning_loops/iapp_loop1_watch_verify_earn.html` Step 3) between `offer-detail` and `watch-verify`, with source evidence footer — satisfies MVP Step 3 without redesigning watch HUD.

**Secondary (presenter ergonomics):** Port a lightweight **PresenterStrip** (Prev/Next + jump chips: Feed, Watch, Wallet, Economics) from `integrations/eye-tracking/demos/investor-demo` — reduces reliance on bottom nav Discover shortcut.

**Tertiary (product truth):** Wire **flutter-runtime** gaze stub per `docs/technical/ANDROID_EYE_TRACKING_SMOKE_TEST_PLAN.md` into `WatchVerifyScreen` (read-only bridge; do not modify `flutter-runtime/` in place per bootstrap rules).

---

## Appendix A — Screen inventory

| # | `DemoScreenId` | Component file |
|---|----------------|----------------|
| 1 | `splash` | `screens/SplashScreen.tsx` |
| 2 | `feed` | `screens/FeedScreen.tsx` |
| 3 | `offer-detail` | `screens/OfferDetailScreen.tsx` |
| 4 | `watch-verify` | `screens/WatchVerifyScreen.tsx` |
| 5 | `verification-result` | `screens/VerificationResultScreen.tsx` |
| 6 | `reward-reveal` | `screens/RewardRevealScreen.tsx` |
| 7 | `wallet` | `screens/WalletScreen.tsx` |
| 8 | `convert` | `screens/ConvertScreen.tsx` |
| 9 | `withdraw-preview` | `screens/WithdrawPreviewScreen.tsx` |
| 10 | `creator-economics` | `screens/CreatorEconomicsScreen.tsx` |
| 11 | `proof-layer` | `screens/ProofLayerScreen.tsx` |
| 12 | `roadmap` | `screens/RoadmapScreen.tsx` |

---

## Appendix B — Safe fixes applied during audit

**None.** Audit was documentation-only; build remains passing.
